import { Reveal } from "@/components/ui/reveal";

/**
 * Cabeçalho padrão das seções. Sempre <h2>: o único <h1> da home é o nome no
 * hero, e a hierarquia não pode pular niveis.
 */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  id,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  id?: string;
}) {
  return (
    <Reveal className="max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2
        id={id}
        className="mt-4 text-[length:var(--text-h2)] text-[var(--color-fg)]"
      >
        {title}
      </h2>
      {lead ? (
        <p className="mt-5 text-[length:var(--text-lead)] leading-relaxed text-[var(--color-fg-muted)]">
          {lead}
        </p>
      ) : null}
    </Reveal>
  );
}
