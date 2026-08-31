"use client";

import { X } from "lucide-react";
import type { ReactNode, RefObject } from "react";

import type { Superficie } from "@/components/ilha/pontos";
import type { Dictionary } from "@/content/i18n";

/**
 * O conteúdo que pousa numa superfície da ilha.
 *
 * O painel não é uma janela flutuando em cima do 3D: ele veste o material do
 * objeto em que pousou. Na tela do monitor ele é uma interface, com barra de
 * janela e brilho de tela acesa. No quadro de projetos e na lousa ele é o
 * próprio papel, sem moldura nenhuma — o conteúdo parece colado ali. No
 * cavalete ele é uma folha.
 *
 * O texto continua sendo HTML de verdade: selecionável, indexável e legível
 * por leitor de tela. Desenhar o conteúdo dentro da textura 3D ficaria mais
 * imersivo e completamente inútil para quem usa leitor de tela ou zoom.
 *
 * A posição vem do 3D: a cada quadro o canvas projeta os cantos da tela na
 * viewport e escreve `left/top/width/height` direto no elemento. Passar isso
 * por estado do React redesenharia a árvore sessenta vezes por segundo.
 *
 * Em tela estreita a conta muda: o retângulo do monitor projetado teria uns
 * duzentos pixels de largura, e ninguém lê um parágrafo ali. Aí o painel
 * larga a tela e vira uma folha normal, ancorada embaixo.
 */
export function PainelTela({
  refPainel,
  aberto,
  ativo,
  folha,
  superficie,
  titulo,
  legenda,
  aoFechar,
  dict,
  children,
}: {
  refPainel: RefObject<HTMLDivElement | null>;
  /** O painel existe (a câmera está indo ou já chegou). */
  aberto: boolean;
  /** A câmera chegou: o conteúdo aceita clique e foco. */
  ativo: boolean;
  /** Modo folha: tela estreita, o painel não segue mais o 3D. */
  folha: boolean;
  superficie: Superficie;
  titulo: string;
  /** Que objeto da ilha está sendo visto, dito por extenso. */
  legenda: string;
  aoFechar: () => void;
  dict: Dictionary;
  children: ReactNode;
}) {
  if (!aberto) return null;

  const eTela = superficie === "tela";

  return (
    <div
      ref={refPainel}
      role="dialog"
      aria-modal="false"
      aria-label={`${titulo} — ${legenda}`}
      className={[
        "superficie fixed z-40 flex flex-col overflow-hidden",
        `sup-${superficie}`,
        /* A tela tem cantos e brilho de monitor. As outras superfícies são o
           próprio objeto, então nada de borda: qualquer moldura entregaria
           que é um retângulo por cima em vez do quadro de verdade. */
        eTela ? "rounded-[6px]" : "",
        ativo ? "" : "pointer-events-none",
        folha
          ? "inset-x-3 bottom-[4.25rem] top-[28vh] mx-auto max-w-[42rem] rounded-[10px] opacity-100 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]"
          : "opacity-0",
      ].join(" ")}
    >
      {eTela ? (
        <header className="barra-tela flex items-center gap-3 border-b border-[var(--risco)] px-4 py-2">
          {/* Três bolinhas: é uma janela dentro de um monitor, e o sinal
              visual de "isto é uma tela" economiza qualquer explicação. */}
          <span aria-hidden="true" className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
          </span>
          <p className="min-w-0 flex-1 truncate font-mono text-xs text-[var(--tinta-fraca)]">
            <span className="text-[var(--tinta)]">{titulo}</span>
            <span className="mx-1.5 opacity-40">/</span>
            {legenda}
          </p>
          <BotaoFechar aoFechar={aoFechar} rotulo={dict.ilha.fechar} />
        </header>
      ) : (
        /* Nas superfícies físicas o botão de fechar flutua no canto: uma
           barra de título num quadro branco não existiria. */
        <div className="pointer-events-none absolute right-2 top-2 z-10">
          <div className="pointer-events-auto">
            <BotaoFechar
              aoFechar={aoFechar}
              rotulo={dict.ilha.fechar}
              sobrePapel
            />
          </div>
        </div>
      )}

      {/* Alcançável pelo teclado porque rola. O painel se molda ao formato da
          tela do móvel, e a do monitor ultrawide é baixa: o texto do "Sobre"
          não cabe e passa a rolar. Área que rola só com o mouse deixa quem
          usa teclado sem o fim do texto — é a regra scrollable-region-focusable,
          e ela apareceu no `npm run a11y:ilha` no dia em que o monitor mudou
          de formato. */}
      <div
        tabIndex={0}
        className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${
          eTela ? "px-5 py-4 sm:px-7 sm:py-6" : "px-5 py-5 sm:px-8 sm:py-7"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function BotaoFechar({
  aoFechar,
  rotulo,
  sobrePapel = false,
}: {
  aoFechar: () => void;
  rotulo: string;
  /** Nas superfícies físicas o botão flutua e pode cair em cima de qualquer
      coisa — a faixa azul do quadro, uma anotação. Aí ele carrega o próprio
      fundo em vez de contar com a sorte do contraste. */
  sobrePapel?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={aoFechar}
      aria-label={rotulo}
      className={`grid size-7 place-items-center transition ${
        sobrePapel
          ? "rounded-full bg-[var(--papel)] text-[var(--tinta)] shadow-[0_1px_4px_rgba(0,0,0,0.3)] hover:bg-[var(--tinta)] hover:text-[var(--papel)]"
          : "rounded-md text-[var(--tinta-fraca)] hover:bg-[color-mix(in_srgb,var(--tinta)_12%,transparent)] hover:text-[var(--tinta)]"
      }`}
    >
      <X aria-hidden="true" className="size-4" />
    </button>
  );
}
