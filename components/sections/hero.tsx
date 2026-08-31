"use client";

import { ArrowDown, ArrowRight, Download, Mail } from "lucide-react";
import { motion } from "motion/react";

import { Github, Linkedin } from "@/components/ui/brand-icons";

import type { Dictionary } from "@/content/i18n";
import { site, type Locale } from "@/content/site";

export function Hero({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const socials = [
    { href: site.github, label: dict.contact.githubLabel, Icon: Github },
    { href: site.linkedin, label: dict.contact.linkedinLabel, Icon: Linkedin },
    { href: `mailto:${site.email}`, label: dict.contact.emailLabel, Icon: Mail },
  ];

  /* Cada linha do título entra com um pequeno atraso em cascata.
     `y` e uma transformação: o reducedMotion="user" do MotionConfig a
     descarta para quem pediu menos movimento, deixando só o fade. Por isso
     as props são sempre as mesmas no servidor e no cliente, nada de
     ramificar o JSX aqui, sob pena de o conteúdo ficar invisível. */
  const line = (index: number) => ({
    initial: { opacity: 0, y: "0.35em" },
    animate: { opacity: 1, y: "0em" },
    transition: {
      duration: 0.8,
      delay: 0.1 + index * 0.12,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  });

  return (
    <section
      id="topo"
      className="relative flex min-h-[100svh] items-center overflow-hidden pt-20"
    >
      {/* Brilho difuso atrás do texto. Decorativo, sem custo de imagem. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-1/4 left-1/2 size-[min(90vw,900px)] -translate-x-1/2 rounded-full opacity-[0.13] blur-[120px]"
        style={{ background: "var(--color-accent)" }}
      />

      <div className="shell relative w-full py-20">
        <motion.p
          {...line(0)}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 font-[family-name:var(--font-mono)] text-xs tracking-wider text-[var(--color-fg-muted)]"
        >
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-[var(--color-accent)]"
          />
          {dict.hero.availability}
        </motion.p>

        <h1 className="mt-8 text-[length:var(--text-display)] leading-[0.95] tracking-[-0.04em]">
          {/* Só o nome vai aqui para o leitor de tela: o cargo já está na própria
              headline, e repetir soaria "Victor Motta, desenvolvedor full
              stack. Desenvolvedor full stack." A headline NÃO é aria-hidden:
              é conteúdo de verdade, e escondê-la deixaria o h1 pela metade. */}
          <span className="sr-only">{site.name}. </span>
          {dict.hero.headline.map((text, index) => (
            <motion.span
              key={text}
              {...line(index + 1)}
              className={`block ${
                index === dict.hero.headline.length - 1
                  ? "text-gradient"
                  : "text-[var(--color-fg)]"
              }`}
            >
              {/* O espaço final separa as linhas quando o leitor de tela
                  junta tudo numa frase só. */}
              {text}{" "}
            </motion.span>
          ))}
        </h1>

        <motion.p
          {...line(4)}
          className="mt-8 max-w-xl text-[length:var(--text-lead)] leading-relaxed text-[var(--color-fg-muted)]"
        >
          {dict.hero.lead}
        </motion.p>

        <motion.div {...line(5)} className="mt-10 flex flex-wrap items-center gap-3">
          <a
            href={`/${locale}#projetos`}
            className="group inline-flex h-14 items-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-accent)] px-7 font-semibold text-[var(--color-accent-ink)] transition-opacity hover:opacity-90"
          >
            {dict.hero.ctaProjects}
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform group-hover:translate-x-1"
            />
          </a>

          <a
            href={site.resume[locale]}
            download
            className="inline-flex h-14 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border-strong)] px-7 font-semibold text-[var(--color-fg)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            <Download aria-hidden="true" className="size-4" />
            {dict.hero.ctaResume}
          </a>
        </motion.div>

        <motion.ul {...line(6)} className="mt-10 flex items-center gap-2">
          {socials.map(({ href, label, Icon }) => (
            <li key={label}>
              <a
                href={href}
                {...(href.startsWith("http")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                aria-label={label}
                className="grid size-11 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                <Icon aria-hidden="true" className="size-[18px]" />
              </a>
            </li>
          ))}
        </motion.ul>
      </div>

      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-8 hidden justify-center md:flex"
      >
        <span className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-xs tracking-widest text-[var(--color-fg-subtle)] uppercase">
          <ArrowDown className="size-3.5" />
          {dict.hero.scrollHint}
        </span>
      </div>
    </section>
  );
}
