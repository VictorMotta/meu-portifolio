"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  ALTURA,
  type Entrada,
  type Jogo,
  LARGURA,
  desenharAtracao,
  desenharJogo,
  novoJogo,
  passo,
} from "@/components/ilha/fliperama";
import { jogos } from "@/content/hobby";
import { format, type Dictionary } from "@/content/i18n";
import type { Locale } from "@/content/site";

/**
 * O painel que pousa na tela do fliperama — e que é a tela do fliperama.
 *
 * As outras paradas da ilha pousam uma interface do site em cima do móvel.
 * Esta não: aproximar a câmera do gabinete não pode trocar a tela dele por
 * outra coisa. Então o painel desenha exatamente o mesmo que a textura
 * pintada na chapa em 3D, com o mesmo código e no mesmo sistema de
 * coordenadas (`fliperama.ts`) — a diferença é que aqui o relógio anda: os
 * bichos marcham, as estrelas piscam, o INSERT COIN acende e apaga. E dá
 * para jogar.
 *
 * É um canvas, e canvas não tem texto. Por isso a lista de jogos existe
 * duas vezes: desenhada, para quem vê, e em HTML fora da tela, para quem
 * ouve ou amplia. Não é gambiarra de acessibilidade — é a mesma regra das
 * outras telas da ilha, só que aqui o desenho é a interface inteira e não
 * dava para servir os dois com um `<p>`.
 *
 * A tela não rola. Ela tem a proporção da chapa do gabinete (1024 x 1208, os
 * mesmos 0,50 por 0,59 do móvel) e sempre cabe inteira no painel: barra de
 * rolagem no meio de um jogo de nave seria o site aparecendo por baixo do
 * brinquedo.
 */

/* O ponteiro grosso do dedo, como loja externa para o `useSyncExternalStore`.
   Fora do componente porque as três funções precisam ser as MESMAS entre
   renderizações: recriá-las a cada uma faria o React reassinar a consulta
   sessenta vezes por segundo enquanto o jogo roda. */
const CONSULTA_TOQUE = "(pointer: coarse)";
function assinarToque(avisar: () => void) {
  const consulta = window.matchMedia(CONSULTA_TOQUE);
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
}
const lerToque = () => window.matchMedia(CONSULTA_TOQUE).matches;
/* No servidor não existe ponteiro: o HTML sai com a redação de teclado e a
   primeira renderização do cliente já corrige, sem descompasso de hidratação
   porque o React compara os dois. */
const lerToqueNoServidor = () => false;

/** O passo fixo do jogo. Ver `passo()` em fliperama.ts. */
const PASSO = 1 / 60;
/** A atração não precisa de 60 Hz: dez quadros por segundo já marcham. */
const MS_ATRACAO = 90;

export function PainelJogos({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const t = dict.ilha.fliperama;
  const refCanvas = useRef<HTMLCanvasElement | null>(null);
  const refJogo = useRef<Jogo | null>(null);
  const refEntrada = useRef<Entrada>({
    esquerda: false,
    direita: false,
    tiro: false,
  });
  /* Só para o leitor de tela e para o rótulo: o desenho não passa por aqui,
     senão a árvore do React seria refeita sessenta vezes por segundo. */
  const [jogando, setJogando] = useState(false);
  const [aviso, setAviso] = useState("");

  /* Aparelho de dedo, que decide a redação das instruções. Por
     `useSyncExternalStore` e não por estado mais efeito: o servidor responde
     `false` e o cliente responde a verdade já na primeira renderização, sem o
     quadro intermediário em que a tela mandaria apertar espaço num celular. */
  const toque = useSyncExternalStore(assinarToque, lerToque, lerToqueNoServidor);

  const comandos = toque ? t.comandosToque : t.comandos;
  const rotuloJogando = toque ? t.jogandoToque : t.jogando;
  const rotuloTela = toque ? t.telaToque : t.tela;

  const comecar = useCallback(() => {
    if (refJogo.current) return;
    refJogo.current = novoJogo();
    setAviso(rotuloJogando);
    setJogando(true);
  }, [rotuloJogando]);

  useEffect(() => {
    const canvas = refCanvas.current;
    const p = canvas?.getContext("2d");
    if (!canvas || !p) return;

    /* Quem pediu menos movimento recebe a mesma tela, parada — e continua
       podendo jogar, porque aí o movimento foi pedido por quem assiste. */
    const parado = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let vivo = true;
    let anterior = 0;
    let sobra = 0;
    let relogio = 0;
    let ultimoDesenho = 0;
    let atracaoParadaPronta = false;
    /* Quantas vidas o aviso já contou: sem isto, o texto do leitor de tela
       seria reescrito a cada quadro e ele repetiria a frase sem parar. */
    let avisosContados = 0;

    const laco = (agora: number) => {
      if (!vivo) return;
      const jogo = refJogo.current;
      const dt = anterior ? Math.min(0.25, (agora - anterior) / 1000) : 0;
      anterior = agora;

      if (jogo) {
        sobra += dt;
        /* Teto de passos por quadro: uma aba que voltou do segundo plano traz
           dez segundos de `dt` e o jogo inteiro aconteceria num quadro. */
        let restantes = 8;
        while (sobra >= PASSO && restantes-- > 0) {
          passo(jogo, refEntrada.current, PASSO);
          sobra -= PASSO;
        }
        sobra = Math.min(sobra, PASSO);
        desenharJogo(p, jogo);

        if (jogo.aviso > avisosContados) {
          avisosContados = jogo.aviso;
          if (jogo.fase === "morrendo") {
            setAviso(format(t.perdeuVida, { n: jogo.vidas }));
          }
        }
        if ((jogo.fase === "fim" || jogo.fase === "venceu") && jogo.espera <= 0) {
          setAviso(
            format(jogo.fase === "fim" ? t.fim : t.venceu, { n: jogo.pontos }),
          );
          refJogo.current = null;
          avisosContados = 0;
          atracaoParadaPronta = false;
          setJogando(false);
        }
      } else if (parado) {
        /* Uma vez só: sem relógio, não há o que redesenhar. A marca é uma
           bandeira própria e não o horário do último desenho — usando o
           horário, voltar de uma partida deixava a tela de atração sem nunca
           ser repintada e o painel ficava preto. */
        if (!atracaoParadaPronta) {
          atracaoParadaPronta = true;
          desenharAtracao(p, dict, locale, 0, comandos);
        }
      } else {
        relogio += dt * 60;
        if (agora - ultimoDesenho >= MS_ATRACAO) {
          ultimoDesenho = agora;
          desenharAtracao(p, dict, locale, Math.floor(relogio), comandos);
        }
      }

      requestAnimationFrame(laco);
    };

    const id = requestAnimationFrame(laco);
    return () => {
      vivo = false;
      cancelAnimationFrame(id);
    };
  }, [dict, locale, comandos, t.fim, t.perdeuVida, t.venceu]);

  /* O jogo para quando o painel sai de cena. */
  useEffect(
    () => () => {
      refJogo.current = null;
    },
    [],
  );

  function tecla(evento: React.KeyboardEvent, apertada: boolean) {
    const entrada = refEntrada.current;
    switch (evento.key) {
      case "ArrowLeft":
      case "a":
      case "A":
        entrada.esquerda = apertada;
        break;
      case "ArrowRight":
      case "d":
      case "D":
        entrada.direita = apertada;
        break;
      case "ArrowUp":
      case " ":
        entrada.tiro = apertada;
        if (apertada) comecar();
        break;
      case "Enter":
        if (apertada) comecar();
        break;
      default:
        return;
    }
    /* Seta e espaço aqui são da nave: sem isto a página rola e a seta muda a
       parada da câmera. */
    evento.preventDefault();
  }

  /* No toque e no mouse a nave segue o dedo, e encostar já é atirar: pedir
     teclado num gabinete seria deixar o celular de fora. */
  function apontar(evento: React.PointerEvent<HTMLCanvasElement>, tocando: boolean) {
    if (!refJogo.current) {
      if (tocando) comecar();
      return;
    }
    const caixa = evento.currentTarget.getBoundingClientRect();
    if (!caixa.width) return;
    const x = ((evento.clientX - caixa.left) / caixa.width) * LARGURA;
    const jogo = refJogo.current;
    /* Direto na posição, sem as teclas: é o "spinner" do gabinete. */
    jogo.naveX = Math.max(50, Math.min(LARGURA - 50 - 66, x - 33));
    refEntrada.current.tiro = tocando;
  }

  return (
    <div className="relative h-full w-full">
      {/* A mesma lista da tela, em texto de verdade: com acento, no idioma
          certo, e fora do alcance de quem enxerga o desenho. */}
      <div className="sr-only">
        <h2>{dict.hobby.jogos}</h2>
        <ul>
          {jogos.map((grupo) => (
            <li key={grupo.rotulo.en}>
              {grupo.rotulo[locale]}: {grupo.itens.join(", ")}
              {grupo.nota ? ` ${grupo.nota[locale]}` : ""}
            </li>
          ))}
        </ul>
      </div>

      <div
        /* `data-fliperama` desliga as setas da ilha enquanto o foco está
           aqui — ver o `aoTeclar` de ilha.tsx. */
        data-fliperama=""
        role="application"
        aria-label={jogando ? rotuloJogando : rotuloTela}
        tabIndex={0}
        onKeyDown={(e) => tecla(e, true)}
        onKeyUp={(e) => tecla(e, false)}
        onBlur={() => {
          refEntrada.current = { esquerda: false, direita: false, tiro: false };
        }}
        className="h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--tinta-fraca)]"
      >
        <canvas
          ref={refCanvas}
          width={LARGURA}
          height={ALTURA}
          aria-hidden="true"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            apontar(e, true);
          }}
          onPointerMove={(e) => {
            if (e.buttons === 0 && e.pointerType === "mouse") return;
            apontar(e, true);
          }}
          onPointerUp={(e) => {
            refEntrada.current.tiro = false;
            e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          /* `pixelated` porque a tela é desenhada em pixels de verdade: o
             filtro suave do navegador transformaria a letra de bloco em
             borrão exatamente onde ela precisa ser dura. */
          className="h-full w-full touch-none select-none object-contain [image-rendering:pixelated]"
        />
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {aviso}
      </p>
    </div>
  );
}
