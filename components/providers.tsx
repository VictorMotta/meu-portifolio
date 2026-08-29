"use client";

import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * next-themes escreve em `data-theme` no <html> — e o seletor que o
 * globals.css usa para o tema claro. O script dele roda antes da primeira
 * pintura, entao nao ha flash de tema errado no carregamento.
 *
 * MotionConfig com reducedMotion="user" e o que faz TODA animacao do site
 * respeitar a preferencia do sistema. Ele age dentro do motion, no momento de
 * animar, e nao no momento de renderizar — que e o detalhe importante:
 * ramificar o JSX com base em useReducedMotion() causaria divergencia de
 * hidratacao (o servidor nao conhece a preferencia do usuario) e o React
 * deixaria o elemento preso no estado inicial, invisivel.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      /* "system" e nao "dark": com defaultTheme="dark" o enableSystem vira
         letra morta e quem usa o computador no claro leva um site preto na
         cara. O escuro continua sendo o padrao do CSS (:root), entao e o que
         o servidor renderiza e o que aparece sem JavaScript. */
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ThemeProvider>
  );
}
