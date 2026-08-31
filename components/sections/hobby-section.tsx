import { ArrowUpRight, BookOpen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { Tag } from "@/components/ui/tag";
import { jogos, mod, trechoLua, MOD_WORKSHOP_ID } from "@/content/hobby";
import type { Dictionary } from "@/content/i18n";
import type { Locale } from "@/content/site";
import { getWorkshopStats } from "@/lib/workshop";

/**
 * "Fora do expediente".
 *
 * É a única seção com linguagem visual própria: a parte profissional do site
 * continua sóbria, e a personalidade fica concentrada aqui. Recrutador que
 * quer só o currículo para de rolar antes; quem chega até aqui descobre uma
 * pessoa que escreve Lua de madrugada.
 */
export async function HobbySection({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const t = dict.hobby;
  /* Buscado no build. Se a Steam não responder, some só o bloco de números. */
  const stats = await getWorkshopStats(MOD_WORKSHOP_ID);

  const numeros = stats
    ? [
        { valor: stats.subscriptions.toLocaleString("pt-BR"), rotulo: t.inscritos },
        { valor: stats.favorited.toLocaleString("pt-BR"), rotulo: t.favoritos },
        { valor: mod.linhasDeLua.toLocaleString("pt-BR"), rotulo: t.linhasLua },
      ]
    : [{ valor: mod.linhasDeLua.toLocaleString("pt-BR"), rotulo: t.linhasLua }];

  return (
    <section id="hobby" className="scroll-mt-24 py-24 sm:py-32">
      <div className="shell">
        <SectionHeading eyebrow={t.eyebrow} title={t.title} lead={t.lead} />

        <div className="mt-14 grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-start">
          <Reveal>
            <article className="rounded-[var(--radius-card)] border border-[var(--color-border)] painel p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <Image
                  src={mod.preview}
                  alt={t.modPreviewAlt}
                  width={256}
                  height={256}
                  sizes="72px"
                  /* image-rendering pixelated: o preview é 256x256 e encolhe
                     para 72. Sem isso o navegador suaviza e some o pixel. */
                  className="size-18 shrink-0 rounded-[var(--radius-control)] border border-[var(--color-border)] [image-rendering:pixelated]"
                />
                <div className="min-w-0">
                  <h3 className="text-[length:var(--text-h3)] text-[var(--color-fg)]">
                    {mod.nome}
                  </h3>
                  <p className="mt-1 font-[family-name:var(--font-mono)] text-xs text-[var(--color-fg-subtle)]">
                    v{mod.versao} · {mod.buildDoJogo}
                  </p>
                </div>
              </div>

              <p className="mt-5 leading-relaxed text-[var(--color-fg-muted)]">
                {t.modResumo}
              </p>

              <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-4">
                {numeros.map((n) => (
                  <div key={n.rotulo}>
                    <dd className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-accent)]">
                      {n.valor}
                    </dd>
                    <dt className="mt-0.5 text-xs text-[var(--color-fg-subtle)]">
                      {n.rotulo}
                    </dt>
                  </div>
                ))}
              </dl>

              <ul className="mt-6 flex flex-wrap gap-2">
                {mod.tags.map((tag) => (
                  <li key={tag}>
                    <Tag>{tag}</Tag>
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href={mod.workshopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-accent)] px-5 font-semibold text-[var(--color-accent-ink)] transition-opacity hover:opacity-90"
                >
                  {t.verNaWorkshop}
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                </a>
                <Link
                  href={`/${locale}/mods/${mod.manualSlug}`}
                  className="inline-flex h-12 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border-strong)] px-5 font-medium text-[var(--color-fg)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  <BookOpen aria-hidden="true" className="size-4" />
                  {t.verManual}
                </Link>
              </div>
            </article>
          </Reveal>

        </div>

        <Reveal delay={0.12}>
          <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-start">
            {/* min-w-0: sem isso o <pre> com o Lua, que tem linhas longas,
                estica a trilha do grid e a página inteira rola de lado no
                celular. O overflow fica dentro do <pre>, não na página. */}
            <div className="min-w-0 rounded-[var(--radius-card)] border border-[var(--color-border)] painel p-6 sm:p-8">
              <h3 className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.12em] text-[var(--color-accent)]">
                {t.comoFunciona}
              </h3>
              <p className="mt-4 leading-relaxed text-[var(--color-fg-muted)]">
                {t.comoFuncionaTexto}
              </p>
              {/* tabIndex e role: o bloco rola de lado, e uma região que rola
                  sem poder receber foco deixa quem usa só o teclado sem
                  alcançar o resto da linha. É o que a regra
                  scrollable-region-focusable cobra. */}
              <pre
                tabIndex={0}
                role="region"
                aria-label={t.comoFunciona}
                className="mt-5 overflow-x-auto rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
              >
                <code className="font-[family-name:var(--font-mono)] text-[13px] leading-relaxed text-[var(--color-fg-muted)]">
                  {trechoLua}
                </code>
              </pre>
            </div>

            <div className="min-w-0 rounded-[var(--radius-card)] border border-[var(--color-border)] painel p-6 sm:p-8">
              <h3 className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.12em] text-[var(--color-accent)]">
                {t.jogos}
              </h3>
              <ul className="mt-5 space-y-5">
                {jogos.map((grupo) => (
                  <li key={grupo.rotulo.en}>
                    <span className="block font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
                      {grupo.rotulo[locale]}
                    </span>
                    <span className="mt-1 block text-[var(--color-fg)]">
                      {grupo.itens.join(" · ")}
                    </span>
                    {grupo.nota ? (
                      <span className="mt-1.5 block text-sm leading-relaxed text-[var(--color-fg-muted)]">
                        {grupo.nota[locale]}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
