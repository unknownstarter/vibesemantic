import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://vibesemantic.xyz",
      lastModified: new Date("2026-01-05"),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}

