"use client";

import { Brush, LayoutList } from "lucide-react";
import { useTheme } from "next-themes";
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
import { PainelJogos } from "@/components/ilha/painel-fliperama";
import { PainelTela } from "@/components/ilha/painel-tela";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Marca } from "@/components/ui/marca";
import { ORDEM_PONTOS, PONTOS, type ChavePonto } from "@/components/ilha/pontos";
import { format, type Dictionary } from "@/content/i18n";
import { mod } from "@/content/hobby";
import { site, type Locale } from "@/content/site";
import { DURACAO_DA_TRANSICAO } from "@/lib/preferencia-ilha";
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
  /* Sair não é imediato: a câmera se afasta primeiro, e a troca de modo
     acontece no fim desse movimento. É a primeira metade do zoom que o fundo
     da página rolável termina. Ver `anunciarTransicao`. */
  const [saindo, setSaindo] = useState(false);
  const sairAnimado = useCallback(() => setSaindo(true), []);
  useEffect(() => {
    if (!saindo) return;
    const t = window.setTimeout(aoSair, DURACAO_DA_TRANSICAO);
    return () => window.clearTimeout(t);
  }, [saindo, aoSair]);

  /* As lamparinas da ilha acendem no escuro. `resolvedTheme` só existe depois
     que o next-themes monta; até lá vale escuro, que é o padrão do CSS e o que
     o servidor renderiza — assim a ilha não começa apagada para escurecer no
     quadro seguinte. */
  const { resolvedTheme } = useTheme();
  const escuro = resolvedTheme !== "light";

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

  /* Quantas vezes o visitante pediu a vista geral. É um CONTADOR e não uma
     bandeira porque o pedido pode se repetir sem que nada mude de estado: com
     a ilha já na vista geral, `destino` continua `null` e o React não vê
     mudança nenhuma — mas o visitante que passeou até a beirada com dois dedos
     acabou de pedir para voltar, e a câmera precisa saber disso. Cada
     incremento é um pedido novo. Mesmo padrão de `pedidoDeArrumar`. */
  const [pedidoDeVistaGeral, setPedidoDeVistaGeral] = useState(0);

  const irPara = useCallback((chave: ChavePonto | null) => {
    setChegou(false);
    setDestino(chave);
    setProjetoAberto(null);
    if (chave === null) setPedidoDeVistaGeral((n) => n + 1);
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
      /* Dentro de um campo de texto as setas são do campo, não da ilha — e
         dentro do fliperama são da nave. Sem esta guarda, mirar para a
         esquerda no jogo mandava a câmera para a parada anterior. */
      const alvo = evento.target as HTMLElement | null;
      if (
        alvo?.closest(
          "input, textarea, select, [contenteditable], [data-fliperama]",
        )
      ) {
        return;
      }

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
      if (!el) return;

      /* O conteúdo só aparece no fim do voo: texto legível passando voando é
         ilegível e ainda embrulha o estômago. */
      const opacidade = Math.max(0, (q.progresso - 0.62) / 0.38);

      /* Em modo folha o painel não pousa na tela do móvel — ele é uma folha
         ancorada embaixo, posicionada por CSS. Só a opacidade vale aqui, e
         vale MUITO: era o único caminho que escrevia opacidade, e ele voltava
         antes de escrever nada. A folha nascia com a classe `opacity-100` e
         aparecia inteira, opaca, no PRIMEIRO quadro do toque, com a câmera
         ainda no meio do voo. No celular era o que se via: a tela chegando
         antes do zoom terminar. */
      if (folha) {
        el.style.opacity = `${opacidade}`;
        return;
      }

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
      el.style.opacity = `${opacidade}`;
    },
    [destino, folha],
  );

  const aoChegar = useCallback(() => setChegou(true), []);
  const aoDerrubar = useCallback((quantidade: number) => setDerrubados(quantidade), []);
  const arrumarIlha = useCallback(() => setPedidoDeArrumar((n) => n + 1), []);
  const marcarInteracao = useCallback(() => setInteragiu(true), []);

  const ponto = destino ? PONTOS[destino] : null;

  /* Só a INTERFACE apaga na saída, e não a cena. Apagar tudo junto foi a
     primeira tentativa e engoliu o movimento: em menos de meio segundo a tela
     estava preta e o afastamento da câmera acontecia atrás de um véu, sem
     ninguém para ver. O canvas fica; o que sai é o HTML colado por cima, que
     viajando junto com o zoom entregaria que é HTML colado por cima. */
  /* O painel de conteúdo NÃO entra nisto: a opacidade dele é escrita a cada
     quadro pelo voo da câmera, e uma classe disputando a mesma propriedade
     criava um fantasma a cada clique. Ver o comentário em `painel-tela.tsx`.
     Se a saída começar com um painel aberto, ele simplesmente vai com a troca
     de modo — é o caso raro, e melhor que o fantasma no caso comum. */
  const sumindo = saindo ? "pointer-events-none opacity-0" : "opacity-100";

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
          escuro={escuro}
          saindo={saindo}
          aoChegar={aoChegar}
          aoAtualizarQuadro={aoAtualizarQuadro}
          aoEscolher={irPara}
          aoDerrubar={aoDerrubar}
          pedidoDeArrumar={pedidoDeArrumar}
          pedidoDeVistaGeral={pedidoDeVistaGeral}
          refPalco={palcoRef}
          aoMudarCursor={setCursor}
          aoInteragir={marcarInteracao}
          dict={dict}
          locale={locale}
          projetos={projetos}
          nomeDoMod={mod.nome}
          nome={site.name}
        />
      </div>

      {/* `absolute inset-0`, e não `relative`: a navegação de dentro se
          posiciona com `absolute inset-0`, e um embrulho `relative` no fluxo
          tem ALTURA ZERO — o `bottom-0` da barra de baixo passava a ser o topo
          da tela, e as seções sumiam do celular, que é a única largura em que
          elas moram lá embaixo. No desktop nada aparecia de errado porque ali
          elas ficam na barra de cima.

          `z-50` no embrulho, e não só no `nav`: um elemento com `opacity` cria
          contexto de empilhamento, então o z-50 de dentro passaria a valer só
          aqui dentro e o painel, que é z-40 e está fora, cobriria os botões.

          `pointer-events-none` porque isto cobre a tela inteira: sem ele, o
          embrulho engoliria o arrasto que gira a ilha. Quem devolve o clique é
          cada botão, como já era. */}
      <div
        className={`pointer-events-none absolute inset-0 z-50 transition-opacity duration-500 ${sumindo}`}
      >
        <NavIlha
          dict={dict}
          locale={locale}
          destino={destino}
          irPara={irPara}
          aoSair={sairAnimado}
        />
      </div>

      {!interagiu && destino === null ? (
        <p className={`pointer-events-none absolute inset-x-0 bottom-20 z-40 mx-auto max-w-md px-6 text-center text-xs text-fg-muted transition-opacity duration-500 lg:bottom-8 ${sumindo}`}>
          {dict.ilha.dicaMouse}
        </p>
      ) : null}

      {derrubados > 0 && destino === null ? (
        <button
          type="button"
          onClick={arrumarIlha}
          className={`safe-bottom pointer-events-auto absolute bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full border border-border bg-surface/90 px-4 py-2 text-sm text-fg shadow-lg backdrop-blur transition duration-500 hover:bg-surface-2 ${sumindo}`}
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
          {ponto.chave === "jogos" ? (
            <PainelJogos dict={dict} locale={locale} />
          ) : null}
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
    jogos: "games",
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
      {/* Barra de cima: sair da parada atual, a marca no meio e as ações que
          não são seções.

          Tudo tem 44 px de altura e o alinhamento é pelo CENTRO. Não era: as
          peças mediam 30, 32, 34, 42 e 44, penduradas num `items-start`, e
          cada uma crescia para baixo do próprio tamanho — três linhas de
          centro diferentes (31, 37 e 38) numa fileira só. Os 44 não são um
          número escolhido aqui: é a altura do botão de tema e do de idioma,
          que são os mesmos componentes do cabeçalho da página rolável e valem
          44 por serem alvo de dedo. O resto da barra é que passou a segui-los.

          `relative` por causa da marca, que é posicionada pelo meio da BARRA e
          não pelo fluxo: os dois grupos das pontas têm larguras diferentes, e
          um item de flex no meio deles ficaria centrado entre eles, não na
          tela. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 p-3 sm:p-4">
        <button
          type="button"
          onClick={() => irPara(null)}
          aria-current={destino === null ? "true" : undefined}
          className="pointer-events-auto inline-flex h-11 shrink-0 items-center rounded-full border border-border bg-surface/85 px-4 font-mono text-xs text-fg backdrop-blur transition hover:bg-surface aria-[current]:border-accent aria-[current]:text-accent"
        >
          {dict.ilha.voltarCurto}
        </button>

        {/* Em tela larga as seções cabem aqui em cima, ao lado do resto. Em
            tela estreita elas descem para a barra de baixo, onde o polegar
            alcança e não competem com o painel. */}
        <ul className="pointer-events-auto hidden h-11 items-center gap-1 rounded-full border border-border bg-surface/85 px-1.5 backdrop-blur lg:flex">
          {ORDEM_PONTOS.map((chave) => (
            <li key={chave}>
              <BotaoPonto
                chave={chave}
                destino={destino}
                irPara={irPara}
                rotulo={dict.nav[rotuloNav(chave)]}
                compacto
              />
            </li>
          ))}
        </ul>

        {/* A marca, no meio da tela. Decorativa de propósito: `aria-hidden`
            porque o nome do site já é anunciado pelo rótulo desta navegação, e
            `pointer-events-none` porque ela fica por cima do canvas — clicável,
            ela viraria um buraco morto no meio da ilha, onde o arrasto que gira
            a cena simplesmente não funcionaria.

            O corte de 1360 px foi medido, não estimado, e mudou quando "Jogos"
            entrou na navegação: com cinco itens a marca já cabia em 1280, com
            seis ela passou a invadir a pílula em 14 px ali. A folga cresce meio
            pixel por pixel de janela, então 1360 é onde sobram os ~24 px que
            separam "perto" de "encostado". Abaixo disso o meio da tela pertence
            à navegação e a marca sai — entre uma marca e o caminho para as
            seções, quem fica é o caminho.

            Por isso o valor é literal e não um `xl`: o limite é onde os dois
            grupos se encontram, e isso muda quando um item entra no menu. Um
            nome de degrau esconderia essa relação. */}
        <Marca className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 text-2xl text-fg min-[1360px]:block" />

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
            className="pointer-events-auto hidden h-11 items-center rounded-full border border-border bg-surface/85 px-4 text-sm text-fg backdrop-blur transition hover:bg-surface aria-[current]:border-accent aria-[current]:text-accent lg:inline-flex"
          >
            {dict.nav.resume}
          </button>
          <button
            type="button"
            onClick={aoSair}
            title={dict.ilha.verComoPaginaDica}
            aria-label={dict.ilha.verComoPagina}
            className="pointer-events-auto inline-flex h-11 items-center gap-1.5 rounded-full border border-border bg-surface/85 px-4 text-sm text-fg backdrop-blur transition hover:bg-surface"
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
  compacto = false,
}: {
  chave: ChavePonto;
  destino: ChavePonto | null;
  irPara: (chave: ChavePonto | null) => void;
  rotulo: string;
  /**
   * Dentro da pílula da barra de cima, onde o botão é 36 e a pílula em volta
   * dele é 44 — os 4 px de folga em cima e embaixo são o que faz o realce da
   * seção atual parecer encaixado, e não colado na borda.
   *
   * Fora dela, na barra de baixo, o botão vale os 44 inteiros: ali ele é alvo
   * de polegar, e é a única navegação que sobra em tela estreita.
   */
  compacto?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => irPara(chave)}
      aria-current={destino === chave ? "true" : undefined}
      className={`inline-flex items-center rounded-full px-4 text-sm text-fg-muted transition hover:bg-surface-2 hover:text-fg aria-[current]:bg-accent aria-[current]:text-accent-ink ${
        compacto ? "h-9" : "h-11"
      }`}
    >
      {rotulo}
    </button>
  );
}
