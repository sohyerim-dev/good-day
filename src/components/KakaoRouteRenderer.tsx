"use client";

import { CoursePlace } from "@/types/course";
import { RouteSegment } from "@/types/route";
import polylineLib from "@mapbox/polyline";
import { Fragment, useEffect } from "react";
import { CustomOverlayMap, Polyline, useMap } from "react-kakao-maps-sdk";

const ROUTE_COLORS = ["#EE6300", "#2563EB", "#16A34A", "#9333EA", "#DC2626"];

export interface SegmentPaths {
  optimized: { lat: number; lng: number }[];
  bus: { lat: number; lng: number }[];
  subway: { lat: number; lng: number }[];
  walk: { lat: number; lng: number }[];
}

interface Props {
  places: CoursePlace[];
  segmentPaths: SegmentPaths[];
  selectedSegment: number | null;
  showTransit: boolean;
  showWalk: boolean;
  segmentVariants: Record<number, "optimized" | "bus" | "subway">;
}

export function decodeRoutePaths(
  results: [
    optimizedData: Record<string, unknown>,
    busData: Record<string, unknown>,
    subwayData: Record<string, unknown>,
    walkData: Record<string, unknown>
  ][]
): { paths: SegmentPaths[]; optimized: RouteSegment[]; bus: RouteSegment[]; subway: RouteSegment[] } {
  const optimizedSegs: RouteSegment[] = [];
  const busSegs: RouteSegment[] = [];
  const subwaySegs: RouteSegment[] = [];
  const paths: SegmentPaths[] = [];

  const decodePath = (encoded?: string): { lat: number; lng: number }[] => {
    if (!encoded) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return polylineLib.decode(encoded as any).map(([lat, lng]: [number, number]) => ({ lat, lng }));
  };

  results.forEach(([optimizedData, busData, subwayData, walkData]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const od = optimizedData as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bd = busData as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sd = subwayData as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wd = walkData as any;

    optimizedSegs.push({ ...od.routes?.[0]?.legs?.[0], walkDuration: wd.walkDuration });
    busSegs.push({ ...bd.routes?.[0]?.legs?.[0], walkDuration: wd.walkDuration });
    subwaySegs.push({ ...sd.routes?.[0]?.legs?.[0], walkDuration: wd.walkDuration });

    paths.push({
      optimized: decodePath(od.routes?.[0]?.polyline?.encodedPolyline),
      bus: decodePath(bd.routes?.[0]?.polyline?.encodedPolyline),
      subway: decodePath(sd.routes?.[0]?.polyline?.encodedPolyline),
      walk: (wd.walkPath ?? []) as { lat: number; lng: number }[],
    });
  });

  return { paths, optimized: optimizedSegs, bus: busSegs, subway: subwaySegs };
}

export default function KakaoRouteRenderer({ places, segmentPaths, selectedSegment, showTransit, showWalk, segmentVariants }: Props) {
  const map = useMap();

  useEffect(() => {
    if (!map || places.length === 0) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kakao = (window as any).kakao;
    if (!kakao?.maps) return;
    const bounds = new kakao.maps.LatLngBounds();
    places.forEach(p => bounds.extend(new kakao.maps.LatLng(p.places.lat, p.places.lng)));
    map.setBounds(bounds);
  }, [map, places]);

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
              <Polyline path={seg.walk} strokeWeight={4} strokeColor={color} strokeOpacity={0.8} strokeStyle="shortdot" />
            )}
          </Fragment>
        );
      })}
    </>
  );
}
