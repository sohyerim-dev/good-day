import { ExploreCoursePlace } from "@/types/place";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect } from "react";

interface Props {
  places: ExploreCoursePlace[]; // 코스 장소 목록
  onMarkerClick: (place: ExploreCoursePlace) => void; // 경로 데이터를 부모 컴포넌트로 올려보내는 콜백 함수
}

// 지도에 코스 첫 번째 장소 마커를 렌더링하는 컴포넌트
// useMap()은 반드시 Map 컴포넌트 내부에서 호출해야 하기 때문에 explore/page.tsx의 Map 자식으로 배치됨
export default function MarkerRenderer({ places, onMarkerClick }: Props) {
  const map = useMap(); // 현재 렌더링된 Google Map 인스턴스
  const markerLib = useMapsLibrary("marker"); // AdvancedMarkerElement(마커 찍는 객체) 사용을 위한 라이브러리

  useEffect(() => {
    if (!map || !markerLib) return;

    // 생성한 마커를 추적해서 클린업 시 제거하기 위한 배열
    const markers: google.maps.marker.AdvancedMarkerElement[] = [];

    places.forEach((p) => {
      // 주황색 커스텀 핀 생성
      const pin = new markerLib.PinElement({
        glyphSrc: new URL("/icons/white-route.svg", location.href),
        background: "#EE6300",
        borderColor: "#EE6300",
      });
      pin.style.setProperty("--gmp-marker-pin-border-width", "3px");

      const marker = new markerLib!.AdvancedMarkerElement({
        position: { lat: p.lat, lng: p.lng },
        map,
        content: pin,
      });

      // 마커 클릭 시 코스 미리보기 바텀시트 표시
      marker.addEventListener("click", () => onMarkerClick(p));
      markers.push(marker);
    });

    // places가 바뀌면 기존 마커를 지도에서 제거 (map = null이면 지도에서 사라짐)
    return () => {
      markers.forEach((marker) => (marker.map = null));
    };
  }, [map, markerLib, places]);
  return null;
}
