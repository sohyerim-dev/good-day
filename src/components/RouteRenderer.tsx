"use client";

import { CoursePlace } from "@/types/course";
import { RouteSegment } from "@/types/route";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect } from "react";

interface Props {
  places: CoursePlace[];
  onRouteData: (data: RouteSegment[]) => void;
}
export default function RouteRenderer({ places, onRouteData }: Props) {
  const map = useMap(); // APIProvider 안의 현재 지도 인스턴스
  const geometryLib = useMapsLibrary("geometry"); // polyline 디코딩에 필요한 구글맵 라이브러리

  const markerLib = useMapsLibrary("marker");

  useEffect(() => {
    if (!map || !geometryLib || !markerLib || places.length < 2) return;

    places.forEach((p) => {
      const content = document.createElement("div");
      content.innerHTML = `<div style="background: white; border: 2px solid #333; border-radius: 8px; padding: 4px 8px; font-size: 12px; font-weight: bold; color: #333;">${p.order}. ${p.places.name}</div>`;

      new markerLib!.AdvancedMarkerElement({
        position: { lat: p.places.lat, lng: p.places.lng },
        map,
        content,
      });
    });

    const bounds = new google.maps.LatLngBounds();
    places.forEach((p) => {
      bounds.extend({ lat: p.places.lat, lng: p.places.lng });
    });

    map.fitBounds(bounds);

    const segments: RouteSegment[] = [];

    async function fetchRoute() {
      for (let i = 0; i < places.length - 1; i++) {
        const res = await fetch("/api/route-directions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            places: [
              { lat: places[i].places.lat, lng: places[i].places.lng },
              { lat: places[i + 1].places.lat, lng: places[i + 1].places.lng },
            ],
          }),
        });
        const data = await res.json();
        const encoded = data.routes?.[0]?.polyline?.encodedPolyline;
        segments.push({
          ...data.routes?.[0]?.legs?.[0],
          walkDuration: data.walkDuration,
        });
        if (!encoded) continue;

        const path = geometryLib?.encoding.decodePath(encoded);
        new google.maps.Polyline({
          path,
          map,
          strokeColor: "#EE6300",
          strokeWeight: 4,
        });

        if (data.walkPath?.length > 1) {
          new google.maps.Polyline({
            path: data.walkPath,
            map,
            strokeColor: "#888",
            strokeWeight: 2,
            strokeOpacity: 0,
            icons: [
              {
                icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 },
                offset: "0",
                repeat: "12px",
              },
            ],
          });
        }
      }
      onRouteData(segments);
    }

    fetchRoute();
  }, [map, geometryLib, places, markerLib]);

  return null;
}
