import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, locales, type Locale } from "@/content/site";

/**
 * Todo conteudo vive sob /pt ou /en. Este proxy pega quem chegou sem prefixo
 * (a raiz, um link antigo, o Google) e manda para o idioma que o navegador
 * pediu.
 *
 * No Next 16 esta convencao chama-se `proxy`; `middleware` ainda funciona mas
 * esta deprecada.
 */

function detectLocale(request: NextRequest): Locale {
  const header = request.headers.get("accept-language");
  if (!header) return defaultLocale;

  /* Accept-Language vem como "pt-BR,pt;q=0.9,en;q=0.8" — ordenamos por q e
     ficamos com o primeiro idioma que o site tem. */
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="))
        ?.slice(2);
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const base = tag.split("-")[0] as Locale;
    if (locales.includes(base)) return base;
  }

  return defaultLocale;
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return NextResponse.next();

  const locale = detectLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  /* Fora do proxy: API, arquivos internos do Next e qualquer coisa com
     extensao (pdf, ico, webp, svg...) servida de /public. */
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
