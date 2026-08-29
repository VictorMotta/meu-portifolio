import type { MetadataRoute } from "next";

import { locales, site } from "@/content/site";
import { getProjectSlugs } from "@/lib/projects";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const home = locales.map((locale) => ({
    url: `${site.url}/${locale}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 1,
  }));

  const slugs = getProjectSlugs();
  const projectPages = locales.flatMap((locale) =>
    slugs.map((slug) => ({
      url: `${site.url}/${locale}/projects/${slug}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.8,
    })),
  );

  return [...home, ...projectPages];
}
