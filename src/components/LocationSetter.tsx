import { useMap } from "@vis.gl/react-google-maps";
import { useEffect } from "react";

export default function LocationSetter({
  lat,
  lng,
  zoom,
}: {
  lat: number;
  lng: number;
  zoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (map && lat && lng) {
      map.panTo({ lat, lng });
      if (zoom) map.setZoom(zoom);
    }
  }, [map, lat, lng, zoom]);
  return null;
}
