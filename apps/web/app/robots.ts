import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      allow: ["/", "/login", "/register", "/services/task-tracker", "/services/habit-tracker", "/services/streamer"],
      disallow: ["/admin", "/api", "/profile", "/me", "/products"],
      userAgent: "*",
    },
    sitemap: "https://forgath.ru/sitemap.xml",
  };
}
