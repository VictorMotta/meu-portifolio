import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import type { Dictionary } from "@/content/i18n";
import { stack, stackGroupOrder, type SkillLevel } from "@/content/stack";

/* A barra é um reforço visual do texto, nunca a única fonte da informação —
   por isso o nivel também aparece escrito no title/sr-only. */
const LEVEL_WIDTH: Record<SkillLevel, string> = {
  core: "100%",
  strong: "72%",
  working: "45%",
};

const LEVEL_LABEL: Record<SkillLevel, { pt: string; en: string }> = {
  core: { pt: "uso diário", en: "daily driver" },
  strong: { pt: "confortável", en: "comfortable" },
  working: { pt: "conhecimento prático", en: "working knowledge" },
};

export function StackSection({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: "pt" | "en";
}) {
  return (
    <section id="stack" className="scroll-mt-24 py-24 sm:py-32">
      <div className="shell">
        <SectionHeading
          eyebrow={dict.stack.eyebrow}
          title={dict.stack.title}
          lead={dict.stack.lead}
        />

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stackGroupOrder.map((group, index) => (
            <Reveal key={group} delay={index * 0.06}>
              <div className="h-full rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                <h3 className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.12em] text-[var(--color-accent)]">
                  {dict.stack.groups[group]}
                </h3>

                <ul className="mt-5 space-y-4">
                  {stack[group].map((skill) => (
                    <li key={skill.name}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm text-[var(--color-fg)]">
                          {skill.name}
                        </span>
                        <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
                          {LEVEL_LABEL[skill.level][locale]}
                        </span>
                      </div>
                      <div
                        aria-hidden="true"
                        className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--color-surface-2)]"
                      >
                        <div
                          className="h-full rounded-full bg-[var(--color-accent)]"
                          style={{ width: LEVEL_WIDTH[skill.level] }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
