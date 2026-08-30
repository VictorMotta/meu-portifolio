import Link from "next/link";

import { getDictionary } from "@/content/i18n";
import { defaultLocale } from "@/content/site";

/**
 * Não da para ler o params dentro de not-found (o Next renderiza fora do
 * contexto da rota), então o 404 fica no idioma padrão.
 */
export default function NotFound() {
  const dict = getDictionary(defaultLocale);

  return (
    <div className="shell flex min-h-[70svh] flex-col items-center justify-center py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-4 text-[length:var(--text-h1)] text-[var(--color-fg)]">
        {dict.notFound.title}
      </h1>
      <p className="mt-4 max-w-md text-[var(--color-fg-muted)]">
        {dict.notFound.lead}
      </p>
      <Link
        href={`/${defaultLocale}`}
        className="mt-8 inline-flex h-14 items-center rounded-[var(--radius-control)] bg-[var(--color-accent)] px-7 font-semibold text-[var(--color-accent-ink)] transition-opacity hover:opacity-90"
      >
        {dict.notFound.back}
      </Link>
    </div>
  );
}
