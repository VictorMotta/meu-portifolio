/**
 * Primeiro elemento focavel da pagina. Fica invisivel ate receber foco pelo
 * Tab, e entao aparece no topo — quem navega por teclado pula o header inteiro
 * em uma tecla, em vez de tabular por toda a navegacao em cada pagina.
 */
export function SkipLink({ label }: { label: string }) {
  return (
    <a
      href="#conteudo"
      className="sr-only-focusable fixed left-4 top-4 z-[100] rounded-[var(--radius-control)] bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[var(--color-accent-ink)] shadow-lg"
    >
      {label}
    </a>
  );
}
