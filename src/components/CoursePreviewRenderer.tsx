import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect } from "react";

interface SelectedCoursePlace {
  order: number;
  places: { name: string; lat: number; lng: number };
}

interface Props {
  places: SelectedCoursePlace[];
}

// 선택된 코스의 장소들에 번호 마커와 경로선을 그리는 컴포넌트
// MarkerRenderer와 마찬가지로 Map 컴포넌트 내부에서 호출해야 함
export default function CoursePreviewRenderer({ places }: Props) {
  const map = useMap();
  const markerLib = useMapsLibrary("marker");
  const mapsLib = useMapsLibrary("maps");

  useEffect(() => {
    if (!map || !markerLib || !mapsLib || places.length === 0) return;

    const markers: google.maps.marker.AdvancedMarkerElement[] = [];

    places.forEach((cp) => {
      const pin = new markerLib.PinElement({
        glyph: String(cp.order),
        glyphColor: "white",
        background: "#EE6300",
        borderColor: "#EE6300",
      });

      const marker = new markerLib.AdvancedMarkerElement({
        position: { lat: cp.places.lat, lng: cp.places.lng },
        map,
        content: pin,
      });
      markers.push(marker);
    });

    const polyline = new mapsLib.Polyline({
      path: places.map((cp) => ({ lat: cp.places.lat, lng: cp.places.lng })),
      geodesic: true,
      strokeColor: "#EE6300",
      strokeOpacity: 0.8,
      strokeWeight: 3,
      map,
    });

    const bounds = new mapsLib.LatLngBounds();
    places.forEach((cp) => bounds.extend({ lat: cp.places.lat, lng: cp.places.lng }));
    map.fitBounds(bounds, 60);

    return () => {
      markers.forEach((m) => (m.map = null));
      polyline.setMap(null);
    };
  }, [map, markerLib, mapsLib, places]);

  return null;
}
