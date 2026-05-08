import { ExploreCoursePlace } from "@/types/place";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect } from "react";

interface Props {
  places: ExploreCoursePlace[]; // 코스 장소 목록
  onMarkerClick: (place: ExploreCoursePlace) => void; // 경로 데이터를 부모 컴포넌트로 올려보내는 콜백 함수
}

export default function MarkerRenderer({ places, onMarkerClick }: Props) {
  const map = useMap(); // 현재 렌더링된 Google Map 인스턴스
  const markerLib = useMapsLibrary("marker"); // AdvancedMarketElement(마커 찍는 객체) 사용을 위한 라이브러리

  useEffect(() => {
    if (!map || !markerLib) return;

    places.forEach((p, i) => {
      const pin = new markerLib.PinElement({
        glyphSrc: new URL("/icons/orange-route.svg", location.href),
        background: "#FFFFFF",
        borderColor: "#EE6300",
      });
      const marker = new markerLib!.AdvancedMarkerElement({
        position: { lat: p.lat, lng: p.lng },
        map,
        content: pin,
      });

      marker.addEventListener("gmp-click", () => onMarkerClick(p));
    });
  }, [map, markerLib, places]);
  return null;
}
