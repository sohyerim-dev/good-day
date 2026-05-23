import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "굿데이",
    short_name: "굿데이",
    description: "나만의 놀기 코스 플래너",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#EE6300",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
