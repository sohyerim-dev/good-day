"use client";

import { ExploreCoursePlace } from "@/types/place";
import { CustomOverlayMap } from "react-kakao-maps-sdk";

interface Props {
  places: ExploreCoursePlace[];
  onMarkerClick: (place: ExploreCoursePlace) => void;
}

export default function KakaoMarkerRenderer({ places, onMarkerClick }: Props) {
  return (
    <>
      {places.map((p) => (
        <CustomOverlayMap key={p.id} position={{ lat: p.lat, lng: p.lng }} yAnchor={1}>
          <div
            onClick={() => onMarkerClick(p)}
            style={{ position: "relative", width: 34, height: 46, cursor: "pointer", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
          >
            <svg width="34" height="46" viewBox="0 0 34 46" style={{ display: "block" }}>
              <path d="M17 0 C7.6 0 0 7.6 0 17 C0 27.2 17 46 17 46 C17 46 34 27.2 34 17 C34 7.6 26.4 0 17 0 Z" fill="#EE6300" />
            </svg>
            <img
              src="/icons/white-route.svg"
              width={18}
              height={18}
              alt=""
              style={{ position: "absolute", top: 8, left: 8 }}
            />
          </div>
        </CustomOverlayMap>
      ))}
    </>
  );
}
