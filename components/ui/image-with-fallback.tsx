"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Imagem que degrada para um bloco desenhado quando o arquivo nao existe.
 *
 * Enquanto as imagens reais nao estiverem em /public, o next/image devolve
 * erro e sobraria o icone de imagem quebrada. Aqui o onError troca por um
 * bloco com as iniciais — parece proposital, nao parece bug.
 *
 * Precisa preencher um pai com `position: relative`: usa `fill`, entao quem
 * define a proporcao e o container.
 */
export function ImageWithFallback({
  src,
  alt,
  fallbackFrom,
  sizes,
  priority = false,
  className = "object-cover transition-transform duration-700 ease-[var(--ease-out-quint)] group-hover:scale-[1.04]",
}: {
  src: string;
  alt: string;
  /** Texto de onde saem as iniciais do fallback (nome do projeto, da pessoa). */
  fallbackFrom: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  /* src vazio nao pode chegar ao next/image: ele avisa que o navegador vai
     baixar a pagina inteira de novo e ainda emite um preload com href "".
     Quando nao ha arquivo, o fallback e o unico caminho. */
  const semImagem = src.trim() === "";

  const initials = fallbackFrom
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();

  if (failed || semImagem) {
    return (
      /* role=img + aria-label: para o leitor de tela isto continua sendo a
         imagem descrita pelo alt, mesmo sem o arquivo. */
      <div
        role="img"
        aria-label={alt}
        className="absolute inset-0 grid place-items-center bg-[var(--color-surface-2)]"
      >
        <span
          aria-hidden="true"
          /* fg-subtle, nao border-strong: as iniciais sao decorativas, mas
             o axe nao sabe disso e reprovaria 1.5:1 de contraste. */
          className="font-[family-name:var(--font-display)] text-6xl font-bold text-[var(--color-fg-subtle)]"
        >
          {initials}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
