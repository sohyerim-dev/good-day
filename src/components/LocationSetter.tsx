import { useMap } from "@vis.gl/react-google-maps";
import { useEffect } from "react";

export default function LocationSetter({
  lat,
  lng,
}: {
  lat: number;
  lng: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (map && lat && lng) map.panTo({ lat, lng });
  }, [map, lat, lng]);
  return null;
}
