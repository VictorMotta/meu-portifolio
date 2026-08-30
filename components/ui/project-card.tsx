import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { Github } from "@/components/ui/brand-icons";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Tag } from "@/components/ui/tag";
import { format, type Dictionary } from "@/content/i18n";
import type { Locale } from "@/content/site";
import type { Project } from "@/lib/projects";

/**
 * Card de projeto.
 *
 * Mostra só a primeira imagem (_1). O carrossel fica na página de detalhe —
 * dentro de um card ele competiria com o link do próprio card.
 *
 * O link do título cobre a área toda com um ::after, então clicar em qualquer
 * ponto funciona — mas o Tab pega um único link, não a área inteira. Os links
 * de repo e demo ficam acima dele no z-index para continuarem clicaveis.
 */
export function ProjectCard({
  project,
  locale,
  dict,
  featured = false,
  priority = false,
}: {
  project: Project;
  locale: Locale;
  dict: Dictionary;
  featured?: boolean;
  priority?: boolean;
}) {
  const href = `/${locale}/projects/${project.slug}`;
  const capa = project.images[0];

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] transition-colors duration-300 hover:border-[var(--color-border-strong)] ${
        featured ? "lg:flex-row" : ""
      }`}
    >
      <div
        className={`relative overflow-hidden bg-[var(--color-surface-2)] ${
          featured ? "aspect-[16/10] lg:aspect-auto lg:w-[58%]" : "aspect-[16/10]"
        }`}
      >
        <ImageWithFallback
          src={capa?.src ?? ""}
          alt={capa?.alt ?? project.title}
          fallbackFrom={project.title}
          priority={priority}
          sizes={
            featured
              ? "(min-width: 1024px) 44rem, 100vw"
              : "(min-width: 768px) 24rem, 100vw"
          }
        />
      </div>

      <div className={`flex flex-1 flex-col p-6 sm:p-8 ${featured ? "lg:justify-center" : ""}`}>
        <div className="flex items-center gap-3">
          <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-fg-subtle)]">
            {project.year}
          </span>
          {featured ? (
            <span className="rounded-full bg-[var(--color-surface-2)] px-2.5 py-0.5 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider text-[var(--color-accent)]">
              {dict.projects.featured}
            </span>
          ) : null}
        </div>

        <h3
          className={`mt-3 text-[var(--color-fg)] ${
            featured ? "text-[length:var(--text-h3)]" : "text-xl"
          }`}
        >
          <Link
            href={href}
            aria-label={format(dict.projects.viewCaseOf, { title: project.title })}
            className="after:absolute after:inset-0 after:content-[''] group-hover:text-[var(--color-accent)]"
          >
            {project.title}
          </Link>
        </h3>

        <p className="mt-3 leading-relaxed text-[var(--color-fg-muted)]">
          {project.summary}
        </p>

        {project.stack.length > 0 ? (
          <ul className="mt-6 flex flex-wrap gap-2">
            {project.stack.map((tech) => (
              <li key={tech}>
                <Tag>{tech}</Tag>
              </li>
            ))}
          </ul>
        ) : null}

        {project.repo || project.live ? (
          /* z-10 para ficar por cima do ::after do link do card. */
          <div className="relative z-10 mt-6 flex flex-wrap items-center gap-4">
            {project.live ? (
              <a
                href={project.live}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={format(dict.projects.liveDemoOf, { title: project.title })}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-fg)] hover:text-[var(--color-accent)]"
              >
                {dict.projects.liveDemo}
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </a>
            ) : null}
            {project.repo ? (
              <a
                href={project.repo}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={format(dict.projects.sourceCodeOf, { title: project.title })}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-fg)] hover:text-[var(--color-accent)]"
              >
                <Github aria-hidden="true" className="size-4" />
                {dict.projects.sourceCode}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
