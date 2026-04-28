"use client";

import { CoursePlace } from "@/types/course";
import { RouteSegment } from "@/types/route";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect } from "react";

interface Props {
  places: CoursePlace[];
  onRouteData: (data: RouteSegment[]) => void;
}
const ROUTE_COLORS = ["#EE6300", "#2563EB", "#16A34A", "#9333EA", "#DC2626"];

export default function RouteRenderer({ places, onRouteData }: Props) {
  const map = useMap();
  const geometryLib = useMapsLibrary("geometry");
  const markerLib = useMapsLibrary("marker");

  useEffect(() => {
    if (!map || !geometryLib || !markerLib || places.length < 2) return;

    places.forEach((p, i) => {
      const color = ROUTE_COLORS[i % ROUTE_COLORS.length];

      const content = document.createElement("div");
      content.innerHTML = `<div style="background: white; border: 2px solid ${color}; border-radius: 8px; padding: 4px 8px; font-size: 12px; font-weight: bold; color: #333;">${p.order}. ${p.places.name}</div>`;

      new markerLib!.AdvancedMarkerElement({
        position: { lat: p.places.lat, lng: p.places.lng },
        map,
        content,
      });

      const dot = document.createElement("div");
      dot.style.cssText = `width: 14px; height: 14px; background: ${color}; border: 3px solid white; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.3);`;
      new markerLib!.AdvancedMarkerElement({
        position: { lat: p.places.lat, lng: p.places.lng },
        map,
        content: dot,
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

        const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
        const path = geometryLib?.encoding.decodePath(encoded);
        new google.maps.Polyline({
          path,
          map,
          strokeColor: color,
          strokeWeight: 4,
        });

        if (data.walkPath?.length > 1) {
          new google.maps.Polyline({
            path: data.walkPath,
            map,
            strokeColor: color,
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
