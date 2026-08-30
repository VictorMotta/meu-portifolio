import { ProjectCard } from "@/components/ui/project-card";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import type { Dictionary } from "@/content/i18n";
import type { Locale } from "@/content/site";
import { getProjects } from "@/lib/projects";

export function ProjectsSection({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  /* Leitura da pasta public/projetos/, feita no build. */
  const projects = getProjects(locale);
  const destaques = projects.filter((p) => p.featured);
  const demais = projects.filter((p) => !p.featured);

  return (
    <section id="projetos" className="scroll-mt-24 py-24 sm:py-32">
      <div className="shell">
        <SectionHeading
          eyebrow={dict.projects.eyebrow}
          title={dict.projects.title}
          lead={dict.projects.lead}
        />

        {projects.length === 0 ? (
          <p className="mt-12 text-[var(--color-fg-muted)]">
            {dict.projects.empty}
          </p>
        ) : (
          <>
            {destaques.length > 0 ? (
              <div className="mt-14 space-y-6">
                {destaques.map((project, index) => (
                  <Reveal key={project.slug}>
                    <ProjectCard
                      project={project}
                      locale={locale}
                      dict={dict}
                      featured
                      /* A primeira imagem costuma ser o LCP da seção —
                         carregar sem lazy melhora a metrica. */
                      priority={index === 0}
                    />
                  </Reveal>
                ))}
              </div>
            ) : null}

            {demais.length > 0 ? (
              <div className={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 ${destaques.length > 0 ? "mt-6" : "mt-14"}`}>
                {demais.map((project, index) => (
                  <Reveal key={project.slug} delay={index * 0.06}>
                    <ProjectCard project={project} locale={locale} dict={dict} />
                  </Reveal>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
