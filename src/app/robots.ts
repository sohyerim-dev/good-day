import { MetadataRoute } from "next";

const BASE_URL = "https://www.good-day-go-out.co.kr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/about", "/hot", "/explore", "/courses/"],
      disallow: ["/my-course/", "/create", "/login", "/signup"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
