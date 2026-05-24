"use client";

import { CoursePlace } from "@/types/course";
import { RouteSegment } from "@/types/route";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect, useRef } from "react";

interface Props {
  places: CoursePlace[];
  onRouteData: (data: RouteSegment[]) => void;
  // null이면 전체 구간 표시, 숫자(0, 1, 2...)면 해당 구간만 표시
  selectedSegment: number | null;
  showTransit: boolean;
  showWalk: boolean;
}

// 컴포넌트 안에 넣으면 리렌더링될 때마다 배열이 새로 만들어지기 때문에 밖에 둬서 한 번만 만들어지고 재사용
const ROUTE_COLORS = ["#EE6300", "#2563EB", "#16A34A", "#9333EA", "#DC2626"];

// 지도 위에 마커, 대중교통 경로(실선), 도보 경로(점선)를 그리는 컴포넌트
export default function RouteRenderer({ places, onRouteData, selectedSegment, showTransit, showWalk }: Props) {
  const map = useMap(); // 현재 렌더링된 Google Map 인스턴스
  const geometryLib = useMapsLibrary("geometry"); // 폴리라인 좌표 디코딩용 라이브러리
  const markerLib = useMapsLibrary("marker"); // AdvancedMarkerElement(마커 찍는 객체) 사용을 위한 라이브러리
  const mapsLib = useMapsLibrary("maps"); // Polyline, LatLngBounds 사용을 위한 라이브러리

  // 구간 인덱스(0, 1, 2...) → 교통수단/도보 Polyline을 분리해서 관리하는 ref
  // ref를 쓰는 이유: state로 관리하면 변경 시 리렌더링이 발생해 지도가 다시 그려지기 때문
  // key: 구간 인덱스 (0 = 1→2번 장소, 1 = 2→3번 장소, ...)
  const segmentPolylinesRef = useRef<Record<number, { transit: google.maps.Polyline[]; walk: google.maps.Polyline[] }>>({});

  // selectedSegment / showTransit / showWalk 변경 시 각 폴리라인 가시성 업데이트
  useEffect(() => {
    if (!map) return;

    Object.entries(segmentPolylinesRef.current).forEach(([key, { transit, walk }]) => {
      const segIdx = parseInt(key);
      const segVisible = selectedSegment === null || selectedSegment === segIdx;
      transit.forEach((p) => p.setMap(segVisible && showTransit ? map : null));
      walk.forEach((p) => p.setMap(segVisible && showWalk ? map : null));
    });
  }, [selectedSegment, showTransit, showWalk, map]);

  // 장소 목록이 바뀌거나 지도/라이브러리가 로드되면 경로를 새로 그림
  useEffect(() => {
    // 지도, 라이브러리 로딩 체크, 장소가 최소 2개 이상인지 체크
    if (!map || !geometryLib || !markerLib || !mapsLib || places.length < 2) return;

    let cancelled = false;
    const markers: google.maps.marker.AdvancedMarkerElement[] = [];
    const polylines: google.maps.Polyline[] = []; // cleanup용 전체 polyline 목록
    segmentPolylinesRef.current = {}; // 이전 경로 데이터 초기화

    // 각 장소에 라벨 마커와 점 마커를 찍기
    places.forEach((p, i) => {
      // 색깔 순환 (1→2→3→4→5→1→2→...)
      const color = ROUTE_COLORS[i % ROUTE_COLORS.length];

      // 장소 이름을 보여주는 라벨 박스 마커
      const content = document.createElement("div");
      content.innerHTML = `<div style="background: white; border: 2px solid ${color}; border-radius: 8px; padding: 4px 8px; font-size: 12px; font-weight: bold; color: #333;">${p.order}. ${p.places.name}</div>`;
      markers.push(new markerLib!.AdvancedMarkerElement({
        position: { lat: p.places.lat, lng: p.places.lng },
        map,
        content,
      }));

      // 장소 위치를 나타내는 색깔 점 마커
      const dot = document.createElement("div");
      dot.style.cssText = `width: 14px; height: 14px; background: ${color}; border: 3px solid white; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.3);`;
      markers.push(new markerLib!.AdvancedMarkerElement({
        position: { lat: p.places.lat, lng: p.places.lng },
        map,
        content: dot,
      }));
    });

    // 모든 장소 좌표를 bounds에 추가하고 fitBounds로 지도 줌/위치 자동 맞춤
    const bounds = new google.maps.LatLngBounds();
    places.forEach((p) => bounds.extend({ lat: p.places.lat, lng: p.places.lng }));
    map.fitBounds(bounds);

    // 경로 데이터를 담을 빈 배열 (바텀시트 교통수단 정보에 사용)
    const segments: RouteSegment[] = [];

    async function fetchRoute() {
      // 교통수단 경로와 도보 경로를 각각 별도 요청으로 병렬 처리
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
              body: JSON.stringify({ places: segPlaces, mode: "walk", isGlobal }),
            }).then((r) => r.json()),
          ]);
        }),
      );

      if (cancelled) return;

      results.forEach(([transitData, walkData], i) => {
        const encoded = transitData.routes?.[0]?.polyline?.encodedPolyline;

        segments.push({
          ...transitData.routes?.[0]?.legs?.[0],
          walkDuration: walkData.walkDuration,
        });

        segmentPolylinesRef.current[i] = { transit: [], walk: [] };

        const color = ROUTE_COLORS[i % ROUTE_COLORS.length];

        if (encoded) {
          const path = geometryLib?.encoding.decodePath(encoded);
          const transitPolyline = new google.maps.Polyline({
            path,
            map: showTransit ? map : null,
            strokeColor: color,
            strokeWeight: 4,
          });
          polylines.push(transitPolyline);
          segmentPolylinesRef.current[i].transit.push(transitPolyline);
        }

        if (walkData.walkPath?.length > 1) {
          const walkPolyline = new google.maps.Polyline({
            path: walkData.walkPath,
            map: showWalk ? map : null,
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
          polylines.push(walkPolyline);
          segmentPolylinesRef.current[i].walk.push(walkPolyline);
        }
      });

      if (!cancelled) onRouteData(segments);
    }

    fetchRoute();

    // 컴포넌트 언마운트 또는 effect 재실행 시 마커·경로선 제거
    return () => {
      cancelled = true;
      markers.forEach((m) => (m.map = null));
      polylines.forEach((p) => p.setMap(null));
      segmentPolylinesRef.current = {};
    };
  }, [map, geometryLib, places, markerLib, mapsLib, onRouteData]);

  // 이 컴포넌트는 지도에 직접 그리기만 하고 HTML을 렌더링하지 않음
  // React 컴포넌트는 반드시 값을 반환해야 하므로 null 반환
  return null;
}
