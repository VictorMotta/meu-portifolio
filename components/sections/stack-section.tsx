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
 * Os três anéis.
 *
 * O de dentro gira mais devagar; o do meio gira ao contrário. Anéis girando
 * no mesmo sentido e na mesma velocidade pareceriam um disco só.
 *
 * Raios em cqw: proporção da largura do container, não pixel fixo.
 */
const RAIOS = [
  { raio: 19, dur: "38s", reverso: false },
  { raio: 31, dur: "52s", reverso: true },
  { raio: 43, dur: "68s", reverso: false },
];

/**
 * Reparte a lista entre os anéis proporcionalmente ao raio.
 *
 * As quantidades eram fixas — 5, 7 e 9. Somavam 21, a stack cresceu para 24, e
 * as três últimas (Vitest, CI/CD e Linux) ficaram sem pastilha nenhuma: mesmo
 * assim continuavam no rodízio das setas, que mandava o foco para um botão que
 * não existia. Dividir pelo raio resolve os dois lados — ninguém fica de fora
 * quando a lista muda, e o espaço entre pastilhas fica parecido nos três
 * anéis, em vez de apertado no de dentro e sobrando no de fora.
 */
function repartir(total: number) {
  const soma = RAIOS.reduce((a, r) => a + r.raio, 0);
  const qtds = RAIOS.map((r) =>
    Math.max(1, Math.round((total * r.raio) / soma)),
  );
  /* O arredondamento pode sobrar ou faltar um item: a diferença vai para o
     anel de fora, que é o que tem mais espaço para absorver. */
  qtds[qtds.length - 1]! += total - qtds.reduce((a, q) => a + q, 0);

  let inicio = 0;
  return RAIOS.map((r, i) => {
    const anel = { ...r, inicio, qtd: qtds[i]! };
    inicio += anel.qtd;
    return anel;
  });
}

const ANEIS = repartir(todosOsSkills.length);

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

        <div className="mt-14">
          {/* ---------- as órbitas ---------- */}
          {/* Deitada e ocupando a largura toda. Quadrada e presa em 32rem ela
              cabia numa coluna de grade e sobrava página vazia dos dois lados;
              e com 24 pastilhas naquele diâmetro elas se atropelavam. */}
          <div
            role="radiogroup"
            aria-label={t.selecione}
            onKeyDown={teclado}
            className="orbita relative aspect-square w-full sm:aspect-[3/2] lg:aspect-[9/4]"
          >
            <div className="absolute inset-0">
              {ANEIS.map((anel, ia) => {
                const itens = todosOsSkills.slice(
                  anel.inicio,
                  anel.inicio + anel.qtd,
                );
                return (
                  /* `--r` e `--dur` ficam aqui e descem por herança: guia, anel
                     e pastilhas precisam do mesmo raio, e repetir o número em
                     três lugares é como eles saem de sincronia. Propriedade
                     personalizada atravessa `display: contents` normalmente. */
                  <div
                    key={ia}
                    className="contents"
                    style={
                      {
                        "--r": `${anel.raio}cqw`,
                        "--dur": anel.dur,
                      } as React.CSSProperties
                    }
                  >
                    {/* Guia parada: é ela que leva o esmaecimento da base e
                        das duas pontas. */}
                    <div aria-hidden="true" className="guia" />
                    <div
                      className={`anel ${anel.reverso ? "anel-reverso" : ""}`}
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
                                /* A pastilha encolhe com o container, mas nunca
                                 abaixo de 34px, que é o mínimo em que o logo
                                 ainda se reconhece. O fator caiu de 9cqw para
                                 4.4cqw junto com a caixa, que agora é a largura
                                 inteira e não mais 32rem. */
                                "--tam": "clamp(34px, 4.4cqw, 50px)",
                              } as React.CSSProperties
                            }
                          >
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
                              <LogoTech nome={s.name} className="size-[46%]" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Centro: marca o eixo das três pistas. */}
            <div
              aria-hidden="true"
              style={{
                width: "clamp(52px, 6.5cqw, 78px)",
                height: "clamp(52px, 6.5cqw, 78px)",
              }}
              className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[var(--color-border-strong)] painel"
            >
              <span className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-fg)]">
                {site.monogram}
              </span>
            </div>
          </div>

          {/* ---------- a ficha ---------- */}
          {/* Deitada, embaixo da órbita: a órbita agora toma a largura toda e
              não sobra coluna ao lado dela. */}
          <div
            className="mt-8 min-w-0 rounded-[var(--radius-card)] border border-[var(--color-border)] painel p-6 sm:p-8"
            role="status"
            aria-live="polite"
          >
            <div className="grid gap-6 sm:grid-cols-[minmax(0,17rem)_1fr] sm:items-center sm:gap-10">
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

              <dl className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
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
            </div>

            <p className="mt-6 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-fg-subtle)]">
              {t.dicaSetas}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
