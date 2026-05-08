"use client";

import { CoursePlace } from "@/types/course";
import { RouteSegment } from "@/types/route";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect } from "react";

interface Props {
  places: CoursePlace[]; // 코스 장소 목록
  onRouteData: (data: RouteSegment[]) => void; // 경로 데이터를 부모 컴포넌트로 올려보내는 콜백 함수
}
// 컴포넌트 안에 넣으면 리렌더링될 때마다 배열이 새로 만들어지기 때문에 밖에 둬 한 번만 만들어지고 재사용
const ROUTE_COLORS = ["#EE6300", "#2563EB", "#16A34A", "#9333EA", "#DC2626"];

// 지도 위에 마커, 대중교통 경로(실선), 도보 경로(점선)를 그리는 컴포넌트
export default function RouteRenderer({ places, onRouteData }: Props) {
  const map = useMap(); // 현재 렌더링된 Google Map 인스턴스
  const geometryLib = useMapsLibrary("geometry"); // 폴리라인 좌표 디코딩용 라이브러리
  const markerLib = useMapsLibrary("marker"); // AdvancedMarketElement(마커 찍는 객체) 사용을 위한 라이브러리

  useEffect(() => {
    // 지도, 라이브러리 로딩 체크, 장소가 최소 2개 이상인지 체크
    if (!map || !geometryLib || !markerLib || places.length < 2) return;

    // 마커 찍기
    places.forEach((p, i) => {
      // 색깔 순환 (1->2->3->4->5->1->2->3->4->5...)
      const color = ROUTE_COLORS[i % ROUTE_COLORS.length];

      // 박스 안에 장소 표기
      const content = document.createElement("div");
      content.innerHTML = `<div style="background: white; border: 2px solid ${color}; border-radius: 8px; padding: 4px 8px; font-size: 12px; font-weight: bold; color: #333;">${p.order}. ${p.places.name}</div>`;

      new markerLib!.AdvancedMarkerElement({
        position: { lat: p.places.lat, lng: p.places.lng },
        map,
        content,
      });

      // 점 표기
      const dot = document.createElement("div");
      dot.style.cssText = `width: 14px; height: 14px; background: ${color}; border: 3px solid white; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.3);`;
      new markerLib!.AdvancedMarkerElement({
        position: { lat: p.places.lat, lng: p.places.lng },
        map,
        content: dot,
      });
    });

    // 지도 범위 맞추기
    // 모든 장소 좌표를 bounds에 추가
    const bounds = new google.maps.LatLngBounds();
    places.forEach((p) => {
      bounds.extend({ lat: p.places.lat, lng: p.places.lng });
    });
    // fitBounds로 모든 장소가 화면에 들어오도록 지도 줌/위치를 자동으로 맞춤
    map.fitBounds(bounds);

    // 경로 데이터를 담을 빈 배열 만들기
    const segments: RouteSegment[] = [];

    async function fetchRoute() {
      // 각 구간마다 /api/route-direction에 두 좌표를 보내서 경로 받기
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

        // 각 구간 데이터를 segments 배열에 쌓기
        segments.push({
          ...data.routes?.[0]?.legs?.[0],
          walkDuration: data.walkDuration,
        });
        if (!encoded) continue;

        const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
        // Google이 폴리라인을 문자열로 압축해서 보내주면 좌표 배열로 풀기
        const path = geometryLib?.encoding.decodePath(encoded);
        // 대중교통 실선
        new google.maps.Polyline({
          path,
          map,
          strokeColor: color,
          strokeWeight: 4,
        });

        if (data.walkPath?.length > 1) {
          // 도보 점선
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
      // 모든 데이터를 배열에 쌓아서 부모에게 올려보내서 바텀시트에 표시
      onRouteData(segments);
    }

    fetchRoute();
  }, [map, geometryLib, places, markerLib]);

  // 해당 컴포넌트는 지도에 직접 그리기만 하고 화면에 HTML을 렌더링하지 않음
  // 하지만 React 컴포넌트는 반드시 뭔가를 반환해야 해서 null을 반환함
  return null;
}
