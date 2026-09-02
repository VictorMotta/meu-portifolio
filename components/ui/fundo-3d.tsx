"use client";

import { Boxes } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useSyncExternalStore } from "react";

import type { Dictionary } from "@/content/i18n";
import type { Locale } from "@/content/site";
import type { Project } from "@/lib/projects";
import {
  assinarIlha,
  lerIlha,
  lerIlhaNoServidor,
  maquinaAguentaOTresD,
} from "@/lib/preferencia-ilha";

/**
 * O mundo 3D como fundo do site.
 *
 * Carrega depois da hidratação, e não junto com a página: o texto aparece e
 * fica utilizável antes de qualquer byte de WebGL descer. Quem chega pelo
 * celular lê o portfólio na hora; o mundo entra atrás.
 *
 * O botão de desligar existe porque WebGL come bateria, e a escolha fica
 * guardada no navegador de quem visita.
 */
const Mundo3D = dynamic(() => import("@/components/ui/mundo-3d"), { ssr: false });

const CHAVE = "mundo3d";
const EVENTO = "mundo3d:mudou";

/* useSyncExternalStore em vez de useState + useEffect: é a API feita para ler
   estado que vive fora do React (aqui, o localStorage). Evita o setState
   dentro de efeito, que dispara render em cascata, e resolve sozinha a
   diferença entre o que o servidor renderiza e o que o navegador sabe. */
function assinar(aoMudar: () => void) {
  window.addEventListener(EVENTO, aoMudar);
  window.addEventListener("storage", aoMudar);
  return () => {
    window.removeEventListener(EVENTO, aoMudar);
    window.removeEventListener("storage", aoMudar);
  };
}

function lerNoNavegador(): "on" | "off" {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo === "off" || salvo === "on") return salvo;
  } catch {
    /* armazenamento bloqueado: cai na conta de capacidade abaixo */
  }
  /* Sem escolha salva, quem decide é a máquina: o sistema solar do fundo é o
     mesmo motor da ilha, e num aparelho fraco ele trava a rolagem do texto —
     que é justamente o que a pessoa veio ler. */
  return maquinaAguentaOTresD() ? "on" : "off";
}

/* No servidor não há mundo: o HTML sai sem canvas, e o 3D entra na hidratação. */
const lerNoServidor = (): "on" | "off" => "off";

export function Fundo3D({
  dict,
  locale,
  projetos,
}: {
  dict: Dictionary;
  locale: Locale;
  /* O fundo pinta as MESMAS telas da ilha, e a lista de projetos é o que o
     quadro de kanban escreve. Ela vem pronta do servidor: `getProjects` lê
     arquivos com `node:fs` e não existe no navegador. */
  projetos: Project[];
}) {
  const estado = useSyncExternalStore(assinar, lerNoNavegador, lerNoServidor);

  /* Com a ilha aberta este fundo fica atrás de uma camada opaca. Continuar
     desenhando seria manter um segundo contexto WebGL vivo para nada. */
  const naIlha =
    useSyncExternalStore(assinarIlha, lerIlha, lerIlhaNoServidor) === "on";

  const ligado = estado === "on" && !naIlha;

  const alternar = useCallback(() => {
    try {
      localStorage.setItem(CHAVE, ligado ? "off" : "on");
    } catch {
      /* sem armazenamento a escolha vale só para esta visita */
    }
    window.dispatchEvent(new Event(EVENTO));
  }, [ligado]);

  return (
    <>
      {/* aria-hidden: é cenário. O conteúdo real é o HTML por cima, e um
          leitor de tela não ganha nada descrevendo cubos. */}
      {/* 45%: o teto que mantém o texto legível sobre os painéis de vidro.
          Ver o cálculo no comentário de .painel em globals.css. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 opacity-45"
      >
        {ligado ? <Mundo3D dict={dict} locale={locale} projetos={projetos} /> : null}

        {/* Véu por cima do 3D.
            Texto sobre cena colorida perde contraste em pontos imprevisíveis,
            e o axe não pega isso porque ele mede contra o CSS, não contra o
            canvas. O gradiente deixa a esquerda sólida, onde o texto mora, e
            libera a direita para o mundo aparecer. É o que torna a leitura
            garantida em vez de sorte. */}
        {ligado ? (
          <>
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(100deg, var(--color-bg) 0%, color-mix(in srgb, var(--color-bg) 92%, transparent) 26%, color-mix(in srgb, var(--color-bg) 55%, transparent) 48%, color-mix(in srgb, var(--color-bg) 10%, transparent) 78%)",
              }}
            />
            {/* Escurece topo e base: o header e o rodapé têm texto pequeno. */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, var(--color-bg) 0%, transparent 14%, transparent 86%, var(--color-bg) 100%)",
              }}
            />
          </>
        ) : null}
      </div>

      <button
        type="button"
        data-cromo-pagina
        onClick={alternar}
        aria-pressed={ligado}
        className="flutua flutua-acima inline-flex h-11 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]/85 px-4 text-xs text-[var(--color-fg-muted)] backdrop-blur transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]"
      >
        <Boxes aria-hidden="true" className="size-4" />
        {ligado ? dict.nav.desligar3d : dict.nav.ligar3d}
      </button>
    </>
  );
}
