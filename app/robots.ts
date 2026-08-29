import type { MetadataRoute } from "next";

import { site } from "@/content/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      /* A rota do formulario nao tem nada para indexar e responde a POST. */
      disallow: "/api/",
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
