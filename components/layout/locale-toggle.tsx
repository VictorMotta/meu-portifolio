"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { locales, type Locale } from "@/content/site";

/**
 * Troca de idioma mantendo a pagina atual: /pt/projects/foo vira
 * /en/projects/foo, e nao um retorno para a home.
 *
 * E um <Link> de verdade, nao um botao — o idioma alternativo fica no HTML,
 * navegavel e indexavel.
 */
export function LocaleToggle({
  locale,
  label,
  shortLabel,
}: {
  locale: Locale;
  label: string;
  shortLabel: string;
}) {
  const pathname = usePathname();
  const target = locales.find((l) => l !== locale) ?? locale;

  /* Troca so o primeiro segmento do caminho. */
  const rest = pathname.replace(new RegExp(`^/${locale}`), "");
  const href = `/${target}${rest}`;

  return (
    <Link
      href={href}
      hrefLang={target}
      aria-label={label}
      className="grid h-11 min-w-11 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-[family-name:var(--font-mono)] text-xs font-medium tracking-wider text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]"
    >
      {shortLabel}
    </Link>
  );
}
