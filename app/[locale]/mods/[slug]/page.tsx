import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { mod as dadosMod } from "@/content/hobby";
import { getDictionary } from "@/content/i18n";
import { locales, site, type Locale } from "@/content/site";
import { getMod, getModSlugs } from "@/lib/mods";

type PageParams = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  const slugs = getModSlugs();
  return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!locales.includes(locale as Locale)) return {};
  const dict = getDictionary(locale as Locale);
  return {
    title: `${dadosMod.nome} — ${dict.hobby.verManual}`,
    description: dict.hobby.modResumo,
    alternates: {
      canonical: `${site.url}/${locale}/mods/${slug}`,
      languages: {
        "pt-BR": `${site.url}/pt/mods/${slug}`,
        "en-US": `${site.url}/en/mods/${slug}`,
      },
    },
  };
}

export default async function ModPage({ params }: PageParams) {
  const { locale, slug } = await params;
  if (!locales.includes(locale as Locale)) notFound();

  const typedLocale = locale as Locale;
  const manual = getMod(typedLocale, slug);
  if (!manual) notFound();

  const dict = getDictionary(typedLocale);

  return (
    <article className="pt-32 pb-24 sm:pt-40 sm:pb-32">
      <div className="shell">
        <Link
          href={`/${locale}#hobby`}
          className="-my-2 inline-flex h-11 items-center gap-2 py-2 text-sm text-[var(--color-fg-muted)] transition-colors hover:text-[var(--color-accent)]"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {dict.hobby.voltarParaMods}
        </Link>

        <header className="mt-8 max-w-3xl">
          <p className="eyebrow">{dict.hobby.manualEyebrow}</p>
          <h1 className="mt-4 text-[length:var(--text-h1)] text-[var(--color-fg)]">
            {dadosMod.nome}
          </h1>
          <p className="mt-3 font-[family-name:var(--font-mono)] text-sm text-[var(--color-fg-subtle)]">
            v{dadosMod.versao} · {dadosMod.buildDoJogo}
          </p>
          <a
            href={dadosMod.workshopUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex h-12 items-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-accent)] px-6 font-semibold text-[var(--color-accent-ink)] transition-opacity hover:opacity-90"
          >
            {dict.hobby.verNaWorkshop}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
        </header>

        {/* Markdown escrito pelo Victor, não por visitante: não passa por
            sanitizador. Se um dia vier de fora, sanitizar deixa de ser opcional. */}
        <div
          className="prose mt-14 max-w-3xl"
          dangerouslySetInnerHTML={{ __html: manual.bodyHtml }}
        />
      </div>
    </article>
  );
}
