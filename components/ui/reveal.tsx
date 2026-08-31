"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Aparicao suave quando o elemento entra na viewport.
 *
 * O deslocamento vertical é uma transformação, e o `reducedMotion="user"` do
 * MotionConfig (em components/providers.tsx) a desliga sozinho para quem pediu
 * menos movimento, sobra só o fade de opacidade, que não provoca desconforto
 * vestibular.
 *
 * Importante: não ramificar o JSX aqui. Uma versão "sem animação" renderizada
 * só no cliente divergiria do HTML do servidor, e o React abandonaria o
 * elemento com opacity:0, deixando a página em branco justamente para quem
 * ativou a preferência de acessibilidade.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const Component = motion[as];

  return (
    <Component
      /* min-w-0 sempre: o Reveal costuma ser item de grid ou flex, onde o
         padrão `min-width: auto` deixa o maior conteúdo interno (um <select>,
         uma URL sem quebra) esticar a trilha e furar o layout em telas
         estreitas. Sem isso o site rolava de lado a 320px. */
      className={`min-w-0 ${className ?? ""}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Component>
  );
}
