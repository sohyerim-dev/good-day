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
        src: "/icons/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
