"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";

import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { format, type Dictionary } from "@/content/i18n";
import type { ProjectImage } from "@/lib/projects";

/**
 * Carrossel das imagens do projeto.
 *
 * Decisoes de acessibilidade:
 *   - Nao roda sozinho. Carrossel automatico tira do usuario o controle do
 *     tempo de leitura e e um dos criterios que reprovam em WCAG.
 *   - So o slide visivel fica no DOM ativo; os outros saem com `hidden`,
 *     entao nem o Tab nem o leitor de tela tropecam em conteudo invisivel.
 *   - A troca e anunciada por uma regiao live discreta ("Imagem 2 de 4").
 *   - Setas do teclado funcionam quando o foco esta dentro do carrossel.
 */
export function ProjectCarousel({
  images,
  title,
  dict,
}: {
  images: ProjectImage[];
  title: string;
  dict: Dictionary;
}) {
  const [atual, setAtual] = useState(0);
  const inicioToque = useRef<number | null>(null);

  const total = images.length;
  const t = dict.projects;

  const ir = (indice: number) => setAtual((indice + total) % total);

  if (total === 0) {
    /* Sem imagem ainda: o placeholder mantem a proporcao para a pagina nao
       pular quando os arquivos chegarem. */
    return (
      <div className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-2)]">
        <ImageWithFallback
          src=""
          alt={title}
          fallbackFrom={title}
          sizes="(min-width: 1280px) 76rem, 100vw"
        />
      </div>
    );
  }

  return (
    <section
      aria-roledescription="carrossel"
      aria-label={format(t.carousel, { title })}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          ir(atual - 1);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          ir(atual + 1);
        }
      }}
    >
      <div
        className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-2)]"
        onTouchStart={(e) => {
          inicioToque.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const inicio = inicioToque.current;
          const fim = e.changedTouches[0]?.clientX;
          inicioToque.current = null;
          if (inicio == null || fim == null) return;
          /* 50px de folga: abaixo disso costuma ser toque, nao arrasto. */
          if (Math.abs(fim - inicio) < 50) return;
          ir(fim < inicio ? atual + 1 : atual - 1);
        }}
      >
        {images.map((image, indice) => (
          <div
            key={image.src}
            hidden={indice !== atual}
            className="absolute inset-0"
          >
            <ImageWithFallback
              src={image.src}
              alt={image.alt}
              fallbackFrom={title}
              priority={indice === 0}
              sizes="(min-width: 1280px) 76rem, 100vw"
              className="object-cover"
            />
          </div>
        ))}

        {total > 1 ? (
          <>
            <button
              type="button"
              onClick={() => ir(atual - 1)}
              aria-label={t.previousImage}
              className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-[var(--color-bg)]/80 text-[var(--color-fg)] backdrop-blur transition-colors hover:bg-[var(--color-bg)]"
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => ir(atual + 1)}
              aria-label={t.nextImage}
              className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-[var(--color-bg)]/80 text-[var(--color-fg)] backdrop-blur transition-colors hover:bg-[var(--color-bg)]"
            >
              <ChevronRight aria-hidden="true" className="size-5" />
            </button>
          </>
        ) : null}
      </div>

      {/* Anuncia a troca sem roubar o foco de quem esta navegando. */}
      <p role="status" aria-live="polite" className="sr-only">
        {format(t.imageCounter, { current: atual + 1, total })}
      </p>

      {total > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-2">
          {images.map((image, indice) => (
            <button
              key={image.src}
              type="button"
              onClick={() => ir(indice)}
              aria-label={format(t.goToImage, { number: indice + 1 })}
              aria-current={indice === atual ? "true" : undefined}
              /* Alvo de 44px por acessibilidade; o ponto colorido dentro e
                 so o indicador visual. */
              className="grid size-11 place-items-center"
            >
              <span
                aria-hidden="true"
                className={`block h-1.5 rounded-full transition-all ${
                  indice === atual
                    ? "w-6 bg-[var(--color-accent)]"
                    : "w-1.5 bg-[var(--color-border-strong)]"
                }`}
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
