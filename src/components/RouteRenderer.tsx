"use client";

import { CoursePlace } from "@/types/course";
import { RouteSegment } from "@/types/route";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect, useRef } from "react";

interface Props {
  places: CoursePlace[];
  onRouteData: (data: { optimized: RouteSegment[]; bus: RouteSegment[]; subway: RouteSegment[] }) => void;
  selectedSegment: number | null;
  showTransit: boolean;
  showWalk: boolean;
  segmentVariants: Record<number, "optimized" | "bus" | "subway">;
}

const ROUTE_COLORS = ["#EE6300", "#2563EB", "#16A34A", "#9333EA", "#DC2626"];

export default function RouteRenderer({ places, onRouteData, selectedSegment, showTransit, showWalk, segmentVariants }: Props) {
  const map = useMap();
  const geometryLib = useMapsLibrary("geometry");
  const markerLib = useMapsLibrary("marker");
  const mapsLib = useMapsLibrary("maps");

  const segmentPolylinesRef = useRef<Record<number, {
    optimized: google.maps.Polyline[];
    bus: google.maps.Polyline[];
    subway: google.maps.Polyline[];
    walk: google.maps.Polyline[];
  }>>({});

  useEffect(() => {
    if (!map) return;

    Object.entries(segmentPolylinesRef.current).forEach(([key, { optimized, bus, subway, walk }]) => {
      const segIdx = parseInt(key);
      const segVisible = selectedSegment === null || selectedSegment === segIdx;
      const variant = segmentVariants[segIdx] ?? "optimized";
      optimized.forEach((p) => p.setMap(segVisible && showTransit && variant === "optimized" ? map : null));
      bus.forEach((p) => p.setMap(segVisible && showTransit && variant === "bus" ? map : null));
      subway.forEach((p) => p.setMap(segVisible && showTransit && variant === "subway" ? map : null));
      walk.forEach((p) => p.setMap(segVisible && showWalk ? map : null));
    });
  }, [selectedSegment, showTransit, showWalk, segmentVariants, map]);

  useEffect(() => {
    if (!map || !geometryLib || !markerLib || !mapsLib || places.length < 2) return;

    let cancelled = false;
    const markers: google.maps.marker.AdvancedMarkerElement[] = [];
    const polylines: google.maps.Polyline[] = [];
    segmentPolylinesRef.current = {};

    places.forEach((p, i) => {
      const color = ROUTE_COLORS[i % ROUTE_COLORS.length];

      const content = document.createElement("div");
      content.innerHTML = `<div style="background: white; border: 2px solid ${color}; border-radius: 8px; padding: 4px 8px; font-size: 12px; font-weight: bold; color: #333;">${p.order}. ${p.places.name}</div>`;
      markers.push(new markerLib!.AdvancedMarkerElement({ position: { lat: p.places.lat, lng: p.places.lng }, map, content }));

      const dot = document.createElement("div");
      dot.style.cssText = `width: 14px; height: 14px; background: ${color}; border: 3px solid white; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.3);`;
      markers.push(new markerLib!.AdvancedMarkerElement({ position: { lat: p.places.lat, lng: p.places.lng }, map, content: dot }));
    });

    const bounds = new google.maps.LatLngBounds();
    places.forEach((p) => bounds.extend({ lat: p.places.lat, lng: p.places.lng }));
    map.fitBounds(bounds);

    const optimizedSegments: RouteSegment[] = [];
    const busSegments: RouteSegment[] = [];
    const subwaySegments: RouteSegment[] = [];

    async function fetchRoute() {
      const results = await Promise.all(
        Array.from({ length: places.length - 1 }, (_, i) => {
          const segPlaces = [
            { lat: places[i].places.lat, lng: places[i].places.lng },
            { lat: places[i + 1].places.lat, lng: places[i + 1].places.lng },
          ];
          const isGlobal = !places[i].places.naver_url || !places[i + 1].places.naver_url;
          return Promise.all([
            fetch("/api/route-directions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ places: segPlaces, mode: "transit" }),
            }).then((r) => r.json()),
            fetch("/api/route-directions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ places: segPlaces, mode: "transit", transitMode: "bus" }),
            }).then((r) => r.json()),
            fetch("/api/route-directions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ places: segPlaces, mode: "transit", transitMode: "subway" }),
            }).then((r) => r.json()),
            fetch("/api/route-directions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ places: segPlaces, mode: "walk", isGlobal }),
            }).then((r) => r.json()),
          ]);
        }),
      );

      if (cancelled) return;

      results.forEach(([optimizedData, busData, subwayData, walkData], i) => {
        const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
        segmentPolylinesRef.current[i] = { optimized: [], bus: [], subway: [], walk: [] };

        optimizedSegments.push({ ...optimizedData.routes?.[0]?.legs?.[0], walkDuration: walkData.walkDuration });
        busSegments.push({ ...busData.routes?.[0]?.legs?.[0], walkDuration: walkData.walkDuration });
        subwaySegments.push({ ...subwayData.routes?.[0]?.legs?.[0], walkDuration: walkData.walkDuration });

        const makeTransitPolyline = (encoded: string | undefined, variant: "optimized" | "bus" | "subway") => {
          if (!encoded) return;
          const path = geometryLib?.encoding.decodePath(encoded);
          const currentVariant = segmentVariants[i] ?? "optimized";
          const p = new google.maps.Polyline({
            path,
            map: showTransit && currentVariant === variant ? map : null,
            strokeColor: color,
            strokeWeight: 4,
          });
          polylines.push(p);
          segmentPolylinesRef.current[i][variant].push(p);
        };

        makeTransitPolyline(optimizedData.routes?.[0]?.polyline?.encodedPolyline, "optimized");
        makeTransitPolyline(busData.routes?.[0]?.polyline?.encodedPolyline, "bus");
        makeTransitPolyline(subwayData.routes?.[0]?.polyline?.encodedPolyline, "subway");

        if (walkData.walkPath?.length > 1) {
          const p = new google.maps.Polyline({
            path: walkData.walkPath,
            map: showWalk ? map : null,
            strokeColor: color,
            strokeWeight: 2,
            strokeOpacity: 0,
            icons: [
              {
                icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 5 },
                offset: "0",
                repeat: "18px",
              },
            ],
          });
          polylines.push(p);
          segmentPolylinesRef.current[i].walk.push(p);
        }
      });

      if (!cancelled) onRouteData({ optimized: optimizedSegments, bus: busSegments, subway: subwaySegments });
    }

    fetchRoute();

    return () => {
      cancelled = true;
      markers.forEach((m) => (m.map = null));
      polylines.forEach((p) => p.setMap(null));
      segmentPolylinesRef.current = {};
    };
  }, [map, geometryLib, places, markerLib, mapsLib, onRouteData]);

  return null;
}
