"use client";

import { Boxes } from "lucide-react";
import { useCallback, useEffect, useSyncExternalStore } from "react";

import { Ilha } from "@/components/ilha/ilha";
import type { Dictionary } from "@/content/i18n";
import type { Locale } from "@/content/site";
import {
  anunciarTransicao,
  assinarIlha,
  definirIlha,
  DURACAO_DA_TRANSICAO,
  lerIlha,
  lerIlhaNoServidor,
} from "@/lib/preferencia-ilha";
import type { Project } from "@/lib/projects";

/**
 * Decide se o visitante vê a ilha em 3D ou a página normal.
 *
 * A página é servida inteira no HTML, sempre. A ilha entra por cima depois da
 * hidratação, e só quando o navegador dá conta: sem WebGL, o portfólio segue
 * de pé em vez de virar uma tela preta. A escolha fica guardada, então quem
 * prefere ler rolando não precisa desligar a ilha toda visita.
 */
export function ModoIlha({
  dict,
  locale,
  projetos,
}: {
  dict: Dictionary;
  locale: Locale;
  projetos: Project[];
}) {
  const estado = useSyncExternalStore(assinarIlha, lerIlha, lerIlhaNoServidor);

  /* Com a ilha aberta, a página de baixo sai do fluxo: some da tela e some
     também da árvore de acessibilidade. Deixar as duas montadas faria o
     leitor de tela ler o portfólio duas vezes — e o fundo voxel da página
     continuaria desenhando atrás de algo opaco. */
  useEffect(() => {
    const raiz = document.documentElement;
    raiz.dataset.ilha = estado === "on" ? "on" : "off";
    return () => {
      delete raiz.dataset.ilha;
    };
  }, [estado]);

  /* Sair já vem animado: quem chama é a própria ilha, depois de afastar a
     câmera. Ver `aoSair` em `ilha.tsx`. */
  const sair = useCallback(() => definirIlha("off"), []);

  /* Entrar avisa PRIMEIRO e troca depois. O aviso faz o fundo da página se
     aproximar da ilha durante a espera; a troca acontece no fim desse
     movimento, e a ilha continua o mesmo zoom de onde a página parou.
     Sem a espera, a página sumiria no meio do próprio movimento. */
  const entrar = useCallback(() => {
    anunciarTransicao("ilha");
    window.setTimeout(() => definirIlha("on"), DURACAO_DA_TRANSICAO);
  }, []);

  if (estado === "indisponivel") return null;

  if (estado === "off") {
    return (
      <button
        type="button"
        onClick={entrar}
        className="flutua safe-bottom inline-flex h-11 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]/85 px-4 text-sm text-[var(--color-fg-muted)] backdrop-blur transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]"
      >
        <Boxes aria-hidden="true" className="size-4 text-accent" />
        {dict.ilha.entrarNaIlha}
      </button>
    );
  }

  return (
    <Ilha dict={dict} locale={locale} projetos={projetos} aoSair={sair} />
  );
}
