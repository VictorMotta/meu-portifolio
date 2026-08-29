import fs from "node:fs";
import path from "node:path";

import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import type { Dictionary } from "@/content/i18n";
import type { Locale } from "@/content/site";
import { site, yearsOfExperience } from "@/content/site";
import { getProjects } from "@/lib/projects";

export function About({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  /* Conferir aqui, no servidor, evita a requisicao para uma foto que nao
     existe — sem isso o otimizador de imagem do Next responde 500 e o log de
     desenvolvimento enche de ruido ate voce colocar o arquivo. */
  const FOTO = "/victor.jpg";
  const temFoto = fs.existsSync(path.join(process.cwd(), "public", FOTO));

  const stats = [
    { value: `${yearsOfExperience()}+`, label: dict.about.stats.experience },
    { value: `${getProjects(locale).length}`, label: dict.about.stats.projects },
    { value: dict.about.stats.focusValue, label: dict.about.stats.focus },
  ];

  return (
    <section id="sobre" className="scroll-mt-24 py-24 sm:py-32">
      <div className="shell">
        <SectionHeading eyebrow={dict.about.eyebrow} title={dict.about.title} />

        <div className="mt-14 grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:items-start lg:gap-16">
          <Reveal>
            <div className="space-y-5 text-[length:var(--text-lead)] leading-relaxed text-[var(--color-fg-muted)]">
              {dict.about.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 24)}>{paragraph}</p>
              ))}
            </div>

            <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <span className="block font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-accent)]">
                      {stat.value}
                    </span>
                    <span
                      aria-hidden="true"
                      className="mt-1 block text-sm text-[var(--color-fg-subtle)]"
                    >
                      {stat.label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={0.1}>
            <figure className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]">
              {/* TODO(victor): coloque a sua foto em /public/victor.jpg.
                  Ate la aparece o monograma, e o layout nao muda quando o
                  arquivo chegar — a proporcao ja esta reservada aqui. */}
              <div className="relative aspect-[4/5]">
                <ImageWithFallback
                  src={temFoto ? FOTO : ""}
                  alt={dict.about.photoAlt}
                  fallbackFrom={site.name}
                  sizes="(min-width: 1024px) 28rem, 100vw"
                  className="object-cover"
                />
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-transparent to-transparent opacity-60"
              />
            </figure>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
