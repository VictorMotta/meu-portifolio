"use client";

import { useRef, useState } from "react";

import { LogoTech } from "@/components/ui/logo-tech";
import { SectionHeading } from "@/components/ui/section-heading";
import { format, type Dictionary } from "@/content/i18n";
import { site, type Locale } from "@/content/site";
import { ATRIBUTOS, todosOsSkills } from "@/content/stack";

const NIVEL: Record<string, { pt: string; en: string }> = {
  core: { pt: "uso diário", en: "daily driver" },
  strong: { pt: "confortável", en: "comfortable" },
  working: { pt: "conhecimento prático", en: "working knowledge" },
};

/**
 * Os 21 itens distribuídos em três anéis.
 *
 * O de dentro tem menos e gira mais devagar; o de fora tem mais e gira ao
 * contrário. Anéis girando no mesmo sentido e na mesma velocidade pareceriam
 * um disco só.
 */
/* Raios em cqw: proporção da largura do container, não pixel fixo. */
const ANEIS = [
  { inicio: 0, qtd: 5, raio: 18, dur: "34s", reverso: false },
  { inicio: 5, qtd: 7, raio: 30, dur: "48s", reverso: true },
  { inicio: 12, qtd: 9, raio: 42, dur: "64s", reverso: false },
];

export function StackSection({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const [escolhido, setEscolhido] = useState(0);
  const botoes = useRef<(HTMLButtonElement | null)[]>([]);
  const t = dict.stack;
  const skill = todosOsSkills[escolhido]!;
  const attrs = ATRIBUTOS[skill.level];

  const irPara = (i: number) => {
    const alvo = (i + todosOsSkills.length) % todosOsSkills.length;
    setEscolhido(alvo);
    botoes.current[alvo]?.focus();
  };

  const teclado = (e: React.KeyboardEvent) => {
    const passo = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[
      e.key
    ];
    if (passo === undefined) return;
    e.preventDefault();
    irPara(escolhido + passo);
  };

  return (
    <section id="stack" className="scroll-mt-24 py-24 sm:py-32">
      <div className="shell">
        <SectionHeading eyebrow={t.eyebrow} title={t.title} lead={t.lead} />

        <div className="mt-14 grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          {/* ---------- as órbitas ---------- */}
          <div
            role="radiogroup"
            aria-label={t.selecione}
            onKeyDown={teclado}
            className="orbita relative mx-auto aspect-square w-full max-w-[min(100%,32rem)]"
          >
            <div className="orbita-cena absolute inset-0">
              {ANEIS.map((anel, ia) => {
                const itens = todosOsSkills.slice(
                  anel.inicio,
                  anel.inicio + anel.qtd,
                );
                const inset = `calc(50% - ${anel.raio}cqw)`;
                return (
                  <div key={ia} className="contents">
                    {/* Guia parada: é ela que leva o esmaecimento da base. */}
                    <div
                      aria-hidden="true"
                      className="guia"
                      style={{ top: inset, right: inset, bottom: inset, left: inset }}
                    />
                    <div
                    className={`anel ${anel.reverso ? "anel-reverso" : ""}`}
                    style={
                      {
                        top: inset,
                        right: inset,
                        bottom: inset,
                        left: inset,
                        "--dur": anel.dur,
                      } as React.CSSProperties
                    }
                  >
                    {itens.map((s, i) => {
                      const global = todosOsSkills.indexOf(s);
                      const ativo = global === escolhido;
                      return (
                        <div
                          key={s.name}
                          className="orbe"
                          style={
                            {
                              "--a": `${(360 / anel.qtd) * i}deg`,
                              "--r": `${anel.raio}cqw`,
                              /* A pastilha encolhe com o container, mas nunca
                                 abaixo de 34px, que é o mínimo em que o logo
                                 ainda se reconhece. */
                              "--tam": "clamp(34px, 9cqw, 48px)",
                            } as React.CSSProperties
                          }
                        >
                          <div
                            className="contra"
                            style={{ "--dur": anel.dur } as React.CSSProperties}
                          >
                            <div className="levanta">
                              <button
                                ref={(el) => {
                                  botoes.current[global] = el;
                                }}
                                type="button"
                                role="radio"
                                aria-checked={ativo}
                                aria-label={s.name}
                                tabIndex={ativo ? 0 : -1}
                                onClick={() => setEscolhido(global)}
                                /* inset-0 preenche o orbe, que já vem
                                   centralizado por margem. Nada de offset
                                   negativo aqui dentro. */
                                className={`absolute inset-0 grid place-items-center rounded-full border-2 shadow-lg transition-colors ${
                                  ativo
                                    ? "border-[var(--color-accent)] bg-[var(--color-surface-2)]"
                                    : "border-[var(--color-border-strong)] bg-[var(--color-surface)] hover:border-[var(--color-fg-subtle)]"
                                }`}
                                /* Fundo sólido e não translúcido: sobre o
                                   mundo 3D o painel de vidro sumia, e um
                                   ícone de 20px não tem área para aguentar
                                   perda de contraste. */
                                style={{ color: s.cor }}
                              >
                                <LogoTech
                                  nome={s.name}
                                  className="size-[22px]"
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Centro: fica fora da cena 3D para não deitar junto com os anéis. */}
            <div
              aria-hidden="true"
              style={{ width: "clamp(56px, 15cqw, 80px)", height: "clamp(56px, 15cqw, 80px)" }}
              className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[var(--color-border-strong)] painel"
            >
              <span className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-fg)]">
                {site.monogram}
              </span>
            </div>
          </div>

          {/* ---------- a ficha ---------- */}
          <div
            className="min-w-0 rounded-[var(--radius-card)] border border-[var(--color-border)] painel p-6 sm:p-8"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-4">
              <span
                aria-hidden="true"
                className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface-2)]"
                style={{ color: skill.cor }}
              >
                <LogoTech nome={skill.name} className="size-6" />
              </span>
              <div className="min-w-0">
                <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-fg)]">
                  {skill.name}
                </h3>
                <p className="mt-0.5 font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider text-[var(--color-accent)]">
                  {t.groups[skill.grupo]} · {NIVEL[skill.level]![locale]}
                </p>
              </div>
            </div>

            <dl className="mt-6 space-y-3">
              {[
                { r: t.dominio, v: attrs.dominio },
                { r: t.frequencia, v: attrs.uso },
              ].map((a) => (
                /* dt e dd precisam ser filhos diretos do div dentro do dl. */
                <div
                  key={a.r}
                  className="grid grid-cols-[1fr_auto] items-baseline gap-x-3"
                >
                  <dt className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
                    {a.r}
                  </dt>
                  {/* O número escrito, e não só a barra: barra sozinha passa a
                      informação apenas por forma. */}
                  <dd className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-fg-muted)]">
                    {format(t.pontos, { valor: a.v })}
                  </dd>
                  <dd
                    aria-hidden="true"
                    className="col-span-2 mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]"
                  >
                    <span
                      className="block h-full rounded-full transition-all duration-300"
                      style={{ width: `${a.v}%`, background: skill.cor }}
                    />
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-6 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-fg-subtle)]">
              {t.dicaSetas}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
