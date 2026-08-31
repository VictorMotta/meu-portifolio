"use client";

import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * next-themes escreve em `data-theme` no <html>, é o seletor que o
 * globals.css usa para o tema claro. O script dele roda antes da primeira
 * pintura, então não há flash de tema errado no carregamento.
 *
 * MotionConfig com reducedMotion="user" é o que faz TODA animação do site
 * respeitar a preferência do sistema. Ele age dentro do motion, no momento de
 * animar, e não no momento de renderizar, que é o detalhe importante:
 * ramificar o JSX com base em useReducedMotion() causaria divergencia de
 * hidratação (o servidor não conhece a preferência do usuário) e o React
 * deixaria o elemento preso no estado inicial, invisível.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      /* "system" e não "dark": com defaultTheme="dark" o enableSystem vira
         letra morta e quem usa o computador no claro leva um site preto na
         cara. O escuro continua sendo o padrão do CSS (:root), então e o que
         o servidor renderiza e o que aparece sem JavaScript. */
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ThemeProvider>
  );
}
