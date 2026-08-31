import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";

import "../globals.css";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { SkipLink } from "@/components/layout/skip-link";
import { Providers } from "@/components/providers";
import { Fundo3D } from "@/components/ui/fundo-3d";
import { GrainOverlay } from "@/components/ui/grain-overlay";
import { getDictionary } from "@/content/i18n";
import { locales, site, type Locale } from "@/content/site";

/* Variáveis CSS consumidas por --font-display / --font-sans / --font-mono
   no globals.css. Servidas pelo próprio domínio, sem round-trip ao Google. */
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type LayoutParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: LayoutParams): Promise<Metadata> {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) return {};

  const dict = getDictionary(locale as Locale);
  const url = `${site.url}/${locale}`;

  return {
    metadataBase: new URL(site.url),
    title: {
      default: dict.meta.title,
      template: `%s · ${site.name}`,
    },
    description: dict.meta.description,
    authors: [{ name: site.name, url: site.url }],
    creator: site.name,
    alternates: {
      canonical: url,
      /* hreflang: diz ao buscador que /pt e /en são a mesma página em
         idiomas diferentes, em vez de conteúdo duplicado. */
      languages: {
        "pt-BR": `${site.url}/pt`,
        "en-US": `${site.url}/en`,
        "x-default": `${site.url}/pt`,
      },
    },
    openGraph: {
      type: "website",
      url,
      siteName: site.name,
      title: dict.meta.title,
      description: dict.meta.description,
      locale: dict.meta.localeTag,
    },
    twitter: {
      card: "summary_large_image",
      title: dict.meta.title,
      description: dict.meta.description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutParams & { children: React.ReactNode }) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();

  const typedLocale = locale as Locale;
  const dict = getDictionary(typedLocale);

  return (
    /* suppressHydrationWarning é necessário porque o next-themes escreve
       data-theme no <html> antes do React hidratar. */
    <html
      lang={dict.meta.localeTag}
      suppressHydrationWarning
      className={`${bricolage.variable} ${inter.variable} ${jetbrains.variable}`}
    >
      <body>
        <Providers>
          <SkipLink label={dict.nav.skipToContent} />
          <Fundo3D dict={dict} />
          <GrainOverlay />
          <Header locale={typedLocale} dict={dict} />
          <main id="conteudo">{children}</main>
          <Footer locale={typedLocale} dict={dict} />
        </Providers>
      </body>
    </html>
  );
}
