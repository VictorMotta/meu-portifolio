import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Github } from "@/components/ui/brand-icons";
import { ProjectCarousel } from "@/components/ui/project-carousel";
import { Tag } from "@/components/ui/tag";
import { format, getDictionary } from "@/content/i18n";
import { locales, site, type Locale } from "@/content/site";
import { getProject, getProjectSlugs } from "@/lib/projects";

type PageParams = { params: Promise<{ locale: string; slug: string }> };

/* Uma página estática por projeto x idioma, gerada no build a partir dos
   arquivos .md em public/projetos/. */
export function generateStaticParams() {
  const slugs = getProjectSlugs();
  return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!locales.includes(locale as Locale)) return {};

  const project = getProject(locale as Locale, slug);
  if (!project) return {};

  const url = `${site.url}/${locale}/projects/${slug}`;

  return {
    title: project.title,
    description: project.summary,
    alternates: {
      canonical: url,
      languages: {
        "pt-BR": `${site.url}/pt/projects/${slug}`,
        "en-US": `${site.url}/en/projects/${slug}`,
      },
    },
    openGraph: {
      type: "article",
      url,
      title: project.title,
      description: project.summary,
      images: project.images[0] ? [project.images[0].src] : undefined,
    },
  };
}

export default async function ProjectPage({ params }: PageParams) {
  const { locale, slug } = await params;
  if (!locales.includes(locale as Locale)) notFound();

  const typedLocale = locale as Locale;
  const project = getProject(typedLocale, slug);
  if (!project) notFound();

  const dict = getDictionary(typedLocale);

  return (
    <article className="pt-32 pb-24 sm:pt-40 sm:pb-32">
      <div className="shell">
        <Link
          href={`/${locale}#projetos`}
          /* -my-2 py-2: cresce a área de toque para 44px sem abrir espaço
             extra no layout. */
          className="-my-2 inline-flex h-11 items-center gap-2 py-2 text-sm text-[var(--color-fg-muted)] transition-colors hover:text-[var(--color-accent)]"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {dict.projects.backToProjects}
        </Link>

        <header className="mt-8 max-w-3xl">
          <h1 className="text-[length:var(--text-h1)] text-[var(--color-fg)]">
            {project.title}
          </h1>
          <p className="mt-5 text-[length:var(--text-lead)] leading-relaxed text-[var(--color-fg-muted)]">
            {project.summary}
          </p>

          {project.live || project.repo ? (
            <div className="mt-8 flex flex-wrap gap-3">
              {project.live ? (
                <a
                  href={project.live}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={format(dict.projects.liveDemoOf, { title: project.title })}
                  className="inline-flex h-12 items-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-accent)] px-6 font-semibold text-[var(--color-accent-ink)] transition-opacity hover:opacity-90"
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
                  className="inline-flex h-12 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border-strong)] px-6 font-semibold text-[var(--color-fg)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  <Github aria-hidden="true" className="size-4" />
                  {dict.projects.sourceCode}
                </a>
              ) : null}
            </div>
          ) : null}
        </header>

        <div className="mt-12">
          <ProjectCarousel
            images={project.images}
            title={project.title}
            dict={dict}
          />
        </div>

        <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_18rem] lg:gap-16">
          <div>
            <h2 className="text-[length:var(--text-h3)] text-[var(--color-fg)]">
              {dict.projects.overview}
            </h2>
            {/* O markdown e escrito pelo Victor, não por visitante, por isso
                não passa por sanitizador. Se um dia o texto vier de fora,
                sanitizar aqui deixa de ser opcional. */}
            <div
              className="prose mt-6"
              dangerouslySetInnerHTML={{ __html: project.bodyHtml }}
            />
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <dl className="space-y-6 rounded-[var(--radius-card)] border border-[var(--color-border)] painel p-6">
              <div>
                <dt className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider text-[var(--color-fg-subtle)]">
                  {dict.projects.year}
                </dt>
                <dd className="mt-1.5 text-[var(--color-fg)]">{project.year}</dd>
              </div>
              {project.role ? (
                <div>
                  <dt className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider text-[var(--color-fg-subtle)]">
                    {dict.projects.role}
                  </dt>
                  <dd className="mt-1.5 text-[var(--color-fg)]">{project.role}</dd>
                </div>
              ) : null}
              {project.stack.length > 0 ? (
                <div>
                  <dt className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider text-[var(--color-fg-subtle)]">
                    {dict.projects.stackLabel}
                  </dt>
                  <dd className="mt-2.5">
                    <ul className="flex flex-wrap gap-2">
                      {project.stack.map((tech) => (
                        <li key={tech}>
                          <Tag>{tech}</Tag>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
            </dl>
          </aside>
        </div>
      </div>
    </article>
  );
}
