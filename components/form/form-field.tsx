"use client";

import type { ReactNode } from "react";

/**
 * Embrulho padrao de campo.
 *
 * Garante o trio que faz o campo funcionar com leitor de tela:
 *   - <label for> real (placeholder nao e rotulo: some quando se digita)
 *   - aria-describedby apontando para dica e erro
 *   - aria-invalid quando ha erro
 *
 * Os ids sao derivados do `id` do campo, entao nao ha como se desencontrarem.
 */
export function FormField({
  id,
  label,
  hint,
  error,
  optionalLabel,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optionalLabel?: string;
  children: (props: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": boolean;
  }) => ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    /* min-w-0: um <select> tem largura intrinseca igual a da opcao mais longa,
       e como item de grid isso esticaria a trilha e furaria o layout em telas
       de 320px. min-w-0 deixa a trilha encolher abaixo do conteudo. */
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className="text-sm font-medium text-[var(--color-fg)]"
        >
          {label}
        </label>
        {optionalLabel ? (
          <span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-fg-subtle)]">
            {optionalLabel}
          </span>
        ) : null}
      </div>

      <div className="mt-2">
        {children({
          id,
          "aria-describedby": describedBy,
          "aria-invalid": Boolean(error),
        })}
      </div>

      {hint ? (
        <p id={hintId} className="mt-2 text-xs text-[var(--color-fg-subtle)]">
          {hint}
        </p>
      ) : null}

      {error ? (
        /* role="alert" faz o leitor de tela anunciar o erro assim que ele
           aparece, sem esperar o proximo foco. */
        <p
          id={errorId}
          role="alert"
          className="mt-2 flex items-start gap-1.5 text-xs text-[var(--color-danger)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Classes compartilhadas por input, select e textarea. */
export const fieldClasses =
  "w-full min-w-0 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] transition-colors hover:border-[var(--color-border-strong)] focus:border-[var(--color-accent)] aria-[invalid=true]:border-[var(--color-danger)]";
