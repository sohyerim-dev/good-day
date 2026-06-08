"use client";

import { useEffect } from "react";
import { CustomOverlayMap, Polyline, useMap } from "react-kakao-maps-sdk";

interface SelectedCoursePlace {
  order: number;
  places: { name: string; lat: number; lng: number };
}

interface Props {
  places: SelectedCoursePlace[];
}

export default function KakaoPreviewRenderer({ places }: Props) {
  const map = useMap();

  useEffect(() => {
    if (!map || places.length === 0) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kakao = (window as any).kakao;
    if (!kakao?.maps) return;
    const bounds = new kakao.maps.LatLngBounds();
    places.forEach((cp) => bounds.extend(new kakao.maps.LatLng(cp.places.lat, cp.places.lng)));
    map.setBounds(bounds, 60, 60, 60, 60);
  }, [map, places]);

  return (
    <>
      {places.map((cp, i) => (
        <CustomOverlayMap
          key={i}
          position={{ lat: cp.places.lat, lng: cp.places.lng }}
          yAnchor={1.4}
        >
          <div style={{
            background: "white",
            border: "2px solid #EE6300",
            borderRadius: 8,
            padding: "3px 8px",
            fontSize: 12,
            fontWeight: "bold",
            color: "#333",
            whiteSpace: "nowrap",
          }}>
            {cp.order}. {cp.places.name}
          </div>
        </CustomOverlayMap>
      ))}
      {places.length > 1 && (
        <Polyline
          path={places.map((cp) => ({ lat: cp.places.lat, lng: cp.places.lng }))}
          strokeWeight={3}
          strokeColor="#EE6300"
          strokeOpacity={0.8}
          strokeStyle="solid"
        />
      )}
    </>
  );
}
