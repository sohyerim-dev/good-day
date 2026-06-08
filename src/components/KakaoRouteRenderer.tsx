"use client";

import { CoursePlace } from "@/types/course";
import { RouteSegment } from "@/types/route";
import polylineLib from "@mapbox/polyline";
import { Fragment, useEffect, useState } from "react";
import { CustomOverlayMap, Polyline, useMap } from "react-kakao-maps-sdk";

const ROUTE_COLORS = ["#EE6300", "#2563EB", "#16A34A", "#9333EA", "#DC2626"];

interface LatLng { lat: number; lng: number }

interface SegmentPaths {
  optimized: LatLng[];
  bus: LatLng[];
  subway: LatLng[];
  walk: LatLng[];
}

interface Props {
  places: CoursePlace[];
  onRouteData: (data: { optimized: RouteSegment[]; bus: RouteSegment[]; subway: RouteSegment[] }) => void;
  selectedSegment: number | null;
  showTransit: boolean;
  showWalk: boolean;
  segmentVariants: Record<number, "optimized" | "bus" | "subway">;
}

export default function KakaoRouteRenderer({ places, onRouteData, selectedSegment, showTransit, showWalk, segmentVariants }: Props) {
  const map = useMap();
  const [segmentPaths, setSegmentPaths] = useState<SegmentPaths[]>([]);

  useEffect(() => {
    if (!map || places.length === 0) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kakao = (window as any).kakao;
    const bounds = new kakao.maps.LatLngBounds();
    places.forEach(p => bounds.extend(new kakao.maps.LatLng(p.places.lat, p.places.lng)));
    map.setBounds(bounds);
  }, [map, places]);

  useEffect(() => {
    if (places.length < 2) return;
    let cancelled = false;

    async function fetchRoutes() {
      const results = await Promise.all(
        Array.from({ length: places.length - 1 }, (_, i) => {
          const segPlaces = [
            { lat: places[i].places.lat, lng: places[i].places.lng },
            { lat: places[i + 1].places.lat, lng: places[i + 1].places.lng },
          ];
          const isGlobal = !places[i].places.naver_url || !places[i + 1].places.naver_url;
          return Promise.all([
            fetch("/api/route-directions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ places: segPlaces, mode: "transit" }) }).then(r => r.json()),
            fetch("/api/route-directions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ places: segPlaces, mode: "transit", transitMode: "bus" }) }).then(r => r.json()),
            fetch("/api/route-directions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ places: segPlaces, mode: "transit", transitMode: "subway" }) }).then(r => r.json()),
            fetch("/api/route-directions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ places: segPlaces, mode: "walk", isGlobal }) }).then(r => r.json()),
          ]);
        })
      );

      if (cancelled) return;

      const optimizedSegs: RouteSegment[] = [];
      const busSegs: RouteSegment[] = [];
      const subwaySegs: RouteSegment[] = [];
      const paths: SegmentPaths[] = [];

      results.forEach(([optimizedData, busData, subwayData, walkData]) => {
        optimizedSegs.push({ ...optimizedData.routes?.[0]?.legs?.[0], walkDuration: walkData.walkDuration });
        busSegs.push({ ...busData.routes?.[0]?.legs?.[0], walkDuration: walkData.walkDuration });
        subwaySegs.push({ ...subwayData.routes?.[0]?.legs?.[0], walkDuration: walkData.walkDuration });

        const decodePath = (encoded?: string): LatLng[] => {
          if (!encoded) return [];
          return polylineLib.decode(encoded).map(([lat, lng]) => ({ lat, lng }));
        };

        paths.push({
          optimized: decodePath(optimizedData.routes?.[0]?.polyline?.encodedPolyline),
          bus: decodePath(busData.routes?.[0]?.polyline?.encodedPolyline),
          subway: decodePath(subwayData.routes?.[0]?.polyline?.encodedPolyline),
          walk: (walkData.walkPath ?? []) as LatLng[],
        });
      });

      setSegmentPaths(paths);
      onRouteData({ optimized: optimizedSegs, bus: busSegs, subway: subwaySegs });
    }

    fetchRoutes();
    return () => { cancelled = true; };
  }, [places, onRouteData]);

  return (
    <>
      {places.map((p, i) => {
        const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
        return (
          <CustomOverlayMap
            key={p.id}
            position={{ lat: p.places.lat, lng: p.places.lng }}
            yAnchor={1.4}
          >
            <div style={{
              background: "white",
              border: `2px solid ${color}`,
              borderRadius: "8px",
              padding: "4px 8px",
              fontSize: "12px",
              fontWeight: "bold",
              color: "#333",
              whiteSpace: "nowrap",
            }}>
              {p.order}. {p.places.name}
            </div>
          </CustomOverlayMap>
        );
      })}

      {segmentPaths.map((seg, i) => {
        const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
        const visible = selectedSegment === null || selectedSegment === i;
        const variant = segmentVariants[i] ?? "optimized";

        return (
          <Fragment key={i}>
            {showTransit && visible && variant === "optimized" && seg.optimized.length > 1 && (
              <Polyline path={seg.optimized} strokeWeight={4} strokeColor={color} strokeOpacity={0.9} strokeStyle="solid" />
            )}
            {showTransit && visible && variant === "bus" && seg.bus.length > 1 && (
              <Polyline path={seg.bus} strokeWeight={4} strokeColor={color} strokeOpacity={0.9} strokeStyle="solid" />
            )}
            {showTransit && visible && variant === "subway" && seg.subway.length > 1 && (
              <Polyline path={seg.subway} strokeWeight={4} strokeColor={color} strokeOpacity={0.9} strokeStyle="solid" />
            )}
            {showWalk && visible && seg.walk.length > 1 && (
              <Polyline path={seg.walk} strokeWeight={2} strokeColor={color} strokeOpacity={0.7} strokeStyle="shortdot" />
            )}
          </Fragment>
        );
      })}
    </>
  );
}
