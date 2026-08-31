"use client";

import { Brush, LayoutList } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Cursor, Quadro } from "@/components/ilha/ilha-canvas";
import {
  PainelContato,
  PainelCurriculo,
  PainelMods,
  PainelProjetos,
  PainelSobre,
  PainelStack,
} from "@/components/ilha/paineis";
import { PainelTela } from "@/components/ilha/painel-tela";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ORDEM_PONTOS, PONTOS, type ChavePonto } from "@/components/ilha/pontos";
import { format, type Dictionary } from "@/content/i18n";
import { mod } from "@/content/hobby";
import { site, type Locale } from "@/content/site";
import type { Project } from "@/lib/projects";

/* O canvas só desce depois da hidratação. O portfólio inteiro já está no HTML
   servido; a ilha é a camada que entra por cima. Quem chega por um celular
   fraco lê o conteúdo antes de qualquer byte de WebGL chegar. */
const IlhaCanvas = dynamic(() => import("@/components/ilha/ilha-canvas"), {
  ssr: false,
});

/**
 * Abaixo disso o retângulo projetado da tela fica pequeno demais para texto e
 * o painel vira folha. É o mesmo `lg` do Tailwind, para a navegação trocar de
 * lugar no mesmo ponto em que o painel troca de modo.
 */
const LARGURA_MINIMA_RASTREIO = 1024;

/* Folga entre o painel e a borda da janela. Em cima sobra mais porque a
   navegação da ilha fica ali. */
const MARGEM_LADO = 20;
const MARGEM_TOPO = 72;
const MARGEM_BAIXO = 24;

type Props = {
  dict: Dictionary;
  locale: Locale;
  projetos: Project[];
  /** Fecha a ilha e devolve a página normal. */
  aoSair: () => void;
};

export function Ilha({ dict, locale, projetos, aoSair }: Props) {
  const [destino, setDestino] = useState<ChavePonto | null>(null);
  const [chegou, setChegou] = useState(false);
  /* Quantas coisas o visitante derrubou, e o contador que pede para arrumar.
     Só o número interessa aqui: quem sabe onde cada coisa estava é a cena. */
  const [derrubados, setDerrubados] = useState(0);
  const [pedidoDeArrumar, setPedidoDeArrumar] = useState(0);
  /* O cursor do palco vem da cena: sobre um móvel ou uma caneca ele vira
     ponteiro, no vazio ele vira mão. Só troca quando muda de verdade, então
     não custa um render por quadro. */
  const [cursor, setCursor] = useState<Cursor>("grab");
  /* A dica de que a ilha responde ao mouse sai assim que o visitante descobre
     sozinho — repetir a instrução depois disso é só ruído. */
  const [interagiu, setInteragiu] = useState(false);
  /* O caso aberto dentro do quadro. Mora aqui, e não dentro do painel, porque
     o Esc precisa saber que existe uma camada a mais: a primeira tecla volta
     do caso para os post-its, e só a segunda fecha o quadro. */
  const [projetoAberto, setProjetoAberto] = useState<string | null>(null);
  const [folha, setFolha] = useState(false);
  const [reduzido, setReduzido] = useState(false);

  const painelRef = useRef<HTMLDivElement>(null);
  const palcoRef = useRef<HTMLDivElement>(null);

  /* Duas preferências do sistema decidem o comportamento: largura da janela
     (o painel gruda na tela ou vira folha) e "menos movimento" (a câmera
     corta em vez de voar). Ler por matchMedia mantém as duas atualizadas se
     o visitante girar o celular ou mudar a preferência no meio da visita. */
  useEffect(() => {
    const estreito = window.matchMedia(`(max-width: ${LARGURA_MINIMA_RASTREIO - 1}px)`);
    const calmo = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sincronizar = () => {
      setFolha(estreito.matches);
      setReduzido(calmo.matches);
    };
    sincronizar();
    estreito.addEventListener("change", sincronizar);
    calmo.addEventListener("change", sincronizar);
    return () => {
      estreito.removeEventListener("change", sincronizar);
      calmo.removeEventListener("change", sincronizar);
    };
  }, []);

  const irPara = useCallback((chave: ChavePonto | null) => {
    setChegou(false);
    setDestino(chave);
    setProjetoAberto(null);
  }, []);

  /* Esc volta para a vista geral; as setas passeiam pelos pontos. É o mesmo
     gesto de um carrossel, e evita obrigar o mouse. */
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        if (projetoAberto !== null) {
          evento.preventDefault();
          setProjetoAberto(null);
          return;
        }
        if (destino !== null) {
          evento.preventDefault();
          irPara(null);
          return;
        }
      }
      if (evento.key !== "ArrowLeft" && evento.key !== "ArrowRight") return;
      /* Dentro de um campo de texto as setas são do campo, não da ilha. */
      const alvo = evento.target as HTMLElement | null;
      if (alvo?.closest("input, textarea, select, [contenteditable]")) return;

      const atual = destino ? ORDEM_PONTOS.indexOf(destino) : -1;
      const passo = evento.key === "ArrowRight" ? 1 : -1;
      const proximo =
        atual === -1
          ? passo === 1
            ? 0
            : ORDEM_PONTOS.length - 1
          : (atual + passo + ORDEM_PONTOS.length) % ORDEM_PONTOS.length;
      evento.preventDefault();
      irPara(ORDEM_PONTOS[proximo] ?? null);
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [destino, projetoAberto, irPara]);

  /* A ponte entre o 3D e o DOM. Roda a cada quadro, então escreve direto no
     estilo do elemento: passar por estado do React redesenharia tudo
     sessenta vezes por segundo para mover um retângulo. */
  const aoAtualizarQuadro = useCallback(
    (q: Quadro) => {
      const el = painelRef.current;
      if (!el || folha) return;
      if (q.largura <= 0 || q.progresso <= 0) {
        el.style.opacity = "0";
        return;
      }
      const ponto = destino ? PONTOS[destino] : null;
      const ocupacao = ponto?.ocupacao ?? 0.9;

      /* O painel fica em cima da tela do móvel, no retângulo que o 3D
         projeta. É o que dá a imersão: o conteúdo é a tela acesa, e o que
         sobra de janela em volta mostra o monitor, o pedestal e a mesa. Quem
         manda no tamanho é o enquadramento da câmera, em `pontos.ts`. */
      let largura = q.largura * ocupacao;
      let altura = q.altura * ocupacao;
      let esquerda = q.x + (q.largura - largura) / 2;
      let topo = q.y + (q.altura - altura) / 2;

      /* Quando tem móvel atrás, a câmera para antes do recuo ideal e a tela
         passa a ser maior que a janela. Aí o painel é aparado para caber:
         continua pousado na tela, mas nenhum canto dele fica fora de alcance.
         A margem de cima é maior porque a navegação mora lá. */
      const dir = Math.min(esquerda + largura, window.innerWidth - MARGEM_LADO);
      const base = Math.min(topo + altura, window.innerHeight - MARGEM_BAIXO);
      esquerda = Math.max(esquerda, MARGEM_LADO);
      topo = Math.max(topo, MARGEM_TOPO);
      largura = Math.max(dir - esquerda, 0);
      altura = Math.max(base - topo, 0);

      el.style.left = `${esquerda}px`;
      el.style.top = `${topo}px`;
      el.style.width = `${largura}px`;
      /* Altura cheia, não a do conteúdo. Deixar o painel encolher até o
         texto parece melhor numa captura e é pior na prática: a tela do
         monitor 3D fica com a MESMA matéria pintada na textura, e o que
         sobrava embaixo do painel era o parágrafo aparecendo de novo, em
         outro tamanho. Cobrindo a janela inteira, não há de onde o texto
         escapar. */
      el.style.height = `${altura}px`;
      /* O conteúdo só aparece no fim do voo: texto legível passando voando
         é ilegível e ainda embrulha o estômago. */
      el.style.opacity = `${Math.max(0, (q.progresso - 0.62) / 0.38)}`;
    },
    [destino, folha],
  );

  const aoChegar = useCallback(() => setChegou(true), []);
  const aoDerrubar = useCallback((quantidade: number) => setDerrubados(quantidade), []);
  const arrumarIlha = useCallback(() => setPedidoDeArrumar((n) => n + 1), []);
  const marcarInteracao = useCallback(() => setInteragiu(true), []);

  const ponto = destino ? PONTOS[destino] : null;

  return (
    <div className="fixed inset-0 z-30 bg-bg">
      {/* aria-hidden: é cenário. O conteúdo de verdade é o HTML dos painéis.
          touch-none: sem isso o navegador entende o arrasto como rolagem e a
          ilha não gira no celular. */}
      <div
        ref={palcoRef}
        aria-hidden="true"
        className="absolute inset-0 touch-none"
        style={{ cursor: destino === null ? cursor : "default" }}
      >
        <IlhaCanvas
          destino={destino}
          reduzido={reduzido}
          folha={folha}
          aoChegar={aoChegar}
          aoAtualizarQuadro={aoAtualizarQuadro}
          aoEscolher={irPara}
          aoDerrubar={aoDerrubar}
          pedidoDeArrumar={pedidoDeArrumar}
          refPalco={palcoRef}
          aoMudarCursor={setCursor}
          aoInteragir={marcarInteracao}
          dict={dict}
          projetos={projetos}
          nomeDoMod={mod.nome}
          nome={site.name}
        />
      </div>

      <NavIlha
        dict={dict}
        locale={locale}
        destino={destino}
        irPara={irPara}
        aoSair={aoSair}
      />

      {!interagiu && destino === null ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-20 z-40 mx-auto max-w-md px-6 text-center text-xs text-fg-muted lg:bottom-8">
          {dict.ilha.dicaMouse}
        </p>
      ) : null}

      {derrubados > 0 && destino === null ? (
        <button
          type="button"
          onClick={arrumarIlha}
          className="safe-bottom pointer-events-auto absolute bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full border border-border bg-surface/90 px-4 py-2 text-sm text-fg shadow-lg backdrop-blur transition hover:bg-surface-2"
        >
          <Brush aria-hidden="true" className="size-4 text-accent" />
          {format(dict.ilha.arrumar, { n: derrubados })}
        </button>
      ) : null}

      {ponto ? (
        <PainelTela
          refPainel={painelRef}
          aberto
          ativo={chegou}
          folha={folha}
          superficie={ponto.superficie}
          dict={dict}
          titulo={dict.nav[rotuloNav(ponto.chave)]}
          legenda={dict.ilha.telas[ponto.chave]}
          aoFechar={() => irPara(null)}
        >
          {ponto.chave === "sobre" ? <PainelSobre dict={dict} /> : null}
          {ponto.chave === "stack" ? <PainelStack dict={dict} /> : null}
          {ponto.chave === "projetos" ? (
            <PainelProjetos
              dict={dict}
              locale={locale}
              projetos={projetos}
              aberto={projetoAberto}
              aoAbrir={setProjetoAberto}
              aoVoltar={() => setProjetoAberto(null)}
            />
          ) : null}
          {ponto.chave === "mods" ? <PainelMods dict={dict} locale={locale} /> : null}
          {ponto.chave === "contato" ? (
            <PainelContato dict={dict} locale={locale} />
          ) : null}
          {ponto.chave === "curriculo" ? (
            <PainelCurriculo dict={dict} locale={locale} />
          ) : null}
        </PainelTela>
      ) : null}
    </div>
  );
}

/** Cada parada da ilha usa o rótulo que a navegação já tinha. */
function rotuloNav(chave: ChavePonto) {
  const mapa = {
    sobre: "about",
    stack: "stack",
    projetos: "projects",
    mods: "hobby",
    contato: "contact",
    curriculo: "resume",
  } as const;
  return mapa[chave];
}

function NavIlha({
  dict,
  locale,
  destino,
  irPara,
  aoSair,
}: {
  dict: Dictionary;
  locale: Locale;
  destino: ChavePonto | null;
  irPara: (chave: ChavePonto | null) => void;
  aoSair: () => void;
}) {
  return (
    <nav
      aria-label={dict.ilha.titulo}
      className="pointer-events-none absolute inset-0 z-50"
    >
      {/* Barra de cima: sair da parada atual e as duas ações que não são
          seções. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start gap-2 p-3 sm:p-4">
        <button
          type="button"
          onClick={() => irPara(null)}
          aria-current={destino === null ? "true" : undefined}
          className="pointer-events-auto shrink-0 rounded-full border border-border bg-surface/85 px-3 py-1.5 font-mono text-xs text-fg backdrop-blur transition hover:bg-surface aria-[current]:border-accent aria-[current]:text-accent"
        >
          {dict.ilha.voltarCurto}
        </button>

        {/* Em tela larga as seções cabem aqui em cima, ao lado do resto. Em
            tela estreita elas descem para a barra de baixo, onde o polegar
            alcança e não competem com o painel. */}
        <ul className="pointer-events-auto hidden items-center gap-1 rounded-full border border-border bg-surface/85 p-1 backdrop-blur lg:flex">
          {ORDEM_PONTOS.map((chave) => (
            <li key={chave}>
              <BotaoPonto
                chave={chave}
                destino={destino}
                irPara={irPara}
                rotulo={dict.nav[rotuloNav(chave)]}
              />
            </li>
          ))}
        </ul>

        {/* Tema e idioma vivem no cabeçalho da página rolável, que fica
            escondido na ilha. Sem eles aqui, quem entra na ilha perde o jeito
            de ler o site em inglês ou no tema claro. */}
        <div className="pointer-events-auto ml-auto flex shrink-0 items-center gap-2">
          <ThemeToggle label={dict.nav.toggleTheme} />
          <LocaleToggle
            locale={locale}
            label={dict.nav.switchLanguage}
            shortLabel={dict.nav.languageShort}
          />
          {/* Em tela estreita o currículo desce para a barra de baixo: aqui
              em cima ele empurraria as outras ações para fora da tela. */}
          <button
            type="button"
            onClick={() => irPara("curriculo")}
            aria-current={destino === "curriculo" ? "true" : undefined}
            className="pointer-events-auto hidden rounded-full border border-border bg-surface/85 px-3 py-1.5 text-sm text-fg backdrop-blur transition hover:bg-surface aria-[current]:border-accent aria-[current]:text-accent lg:block"
          >
            {dict.nav.resume}
          </button>
          <button
            type="button"
            onClick={aoSair}
            title={dict.ilha.verComoPaginaDica}
            aria-label={dict.ilha.verComoPagina}
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/85 px-3 py-1.5 text-sm text-fg backdrop-blur transition hover:bg-surface"
          >
            <LayoutList aria-hidden="true" className="size-4" />
            <span className="hidden xl:inline">{dict.ilha.verComoPagina}</span>
          </button>
        </div>
      </div>

      {/* Barra de baixo, só em tela estreita. Rola na horizontal em vez de
          quebrar em três linhas por cima do painel. */}
      <ul className="safe-bottom pointer-events-auto absolute inset-x-0 bottom-0 flex gap-1 overflow-x-auto border-t border-border bg-surface/90 p-2 backdrop-blur lg:hidden">
        {[...ORDEM_PONTOS, "curriculo" as const].map((chave) => (
          <li key={chave} className="shrink-0">
            <BotaoPonto
              chave={chave}
              destino={destino}
              irPara={irPara}
              rotulo={dict.nav[rotuloNav(chave)]}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function BotaoPonto({
  chave,
  destino,
  irPara,
  rotulo,
}: {
  chave: ChavePonto;
  destino: ChavePonto | null;
  irPara: (chave: ChavePonto | null) => void;
  rotulo: string;
}) {
  return (
    <button
      type="button"
      onClick={() => irPara(chave)}
      aria-current={destino === chave ? "true" : undefined}
      className="rounded-full px-3 py-1.5 text-sm text-fg-muted transition hover:bg-surface-2 hover:text-fg aria-[current]:bg-accent aria-[current]:text-accent-ink"
    >
      {rotulo}
    </button>
  );
}
