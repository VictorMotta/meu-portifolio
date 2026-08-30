"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/**
 * Alterna claro/escuro.
 *
 * Os dois ícones são renderizados sempre e o CSS mostra o certo a partir do
 * `data-theme` do <html> (ver globals.css). Isso evita o padrão de estado
 * "mounted": o servidor não conhece a preferência do usuário, então qualquer
 * decisão em JavaScript custaria um render extra e um instante com o ícone
 * errado. O script do next-themes já escreve o atributo antes da primeira
 * pintura, e o CSS resolve o resto.
 *
 * `aria-label` descreve a acao, não o estado — por isso não há aria-pressed:
 * "alternar entre tema claro e escuro" faz sentido em qualquer um dos dois.
 */
export function ThemeToggle({ label }: { label: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label={label}
      className="grid size-11 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]"
    >
      <Sun aria-hidden="true" className="theme-icon-to-light size-[18px]" />
      <Moon aria-hidden="true" className="theme-icon-to-dark size-[18px]" />
    </button>
  );
}
