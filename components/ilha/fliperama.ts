import {
  INIMIGO,
  NAVE,
  type Pincel,
  blocos,
  blocosCentrado,
  larguraBlocos,
  pixels,
} from "@/components/ilha/pixel";
import { jogos, mod } from "@/content/hobby";
import type { Dictionary } from "@/content/i18n";
import type { Locale } from "@/content/site";

/**
 * A tela do fliperama: o desenho e o jogo.
 *
 * Mora fora de `texturas.ts` porque tem dois donos, e os dois têm de mostrar
 * exatamente a mesma tela. De longe é uma textura pintada uma vez na chapa do
 * gabinete em 3D; de perto é um canvas animado no painel que pousa em cima
 * dessa chapa. Se cada lado desenhasse a sua versão, aproximar a câmera
 * trocaria a tela do móvel por outra coisa.
 *
 * Por isso o desenho é sempre o mesmo par de funções, no mesmo sistema de
 * coordenadas de 1024 x 1208: a textura chama `desenharAtracao` no quadro 0,
 * o painel chama a mesma função com o relógio andando.
 */

export const LARGURA = 1024;
export const ALTURA = 1208;

/* Quatro cores saturadas sobre preto, que é o que um tubo da época conseguia
   acender sem lavar. As mesmas do painel, em `.sup-fliperama`. */
const BRANCO = "#ffffff";
const CIANO = "#3fe0ff";
const AMARELO = "#ffd23f";
const VERMELHO = "#ff4b4b";
const VERDE = "#4dff88";
const MAGENTA = "#ff5cd0";

/**
 * O segundo quadro do bicho: as mesmas onze colunas com as pernas trocadas.
 *
 * Dois desenhos alternando é como um gabinete dava impressão de perna andando
 * com meia dúzia de bytes. O primeiro quadro é o `INIMIGO` de `pixel.ts`, que
 * é também o que a textura mostra parada.
 */
const INIMIGO_B = [
  "..#.....#..",
  "#..#...#..#",
  "#.#######.#",
  "###.###.###",
  "###########",
  ".#########.",
  "..#.....#..",
  ".#.......#.",
];

/* ---------- o fundo, comum às duas telas ---------- */

/**
 * Preto e o campo de estrelas.
 *
 * A semente é fixa de propósito: `Math.random` daria um céu diferente a cada
 * quadro e o fundo viraria chuvisco. O que pisca é escolhido pelo relógio,
 * não pelo sorteio — assim cada estrela acende sempre no mesmo lugar.
 */
function fundo(p: Pincel, quadro: number) {
  p.fillStyle = "#000000";
  p.fillRect(0, 0, LARGURA, ALTURA);

  let semente = 20260831;
  const sorteio = () => {
    semente = (semente * 1664525 + 1013904223) % 4294967296;
    return semente / 4294967296;
  };
  for (let i = 0; i < 140; i++) {
    const x = Math.floor(sorteio() * LARGURA);
    const y = Math.floor(sorteio() * ALTURA);
    const base = 0.14 + sorteio() * 0.3;
    /* Uma estrela em cada sete pisca, e nunca as mesmas ao mesmo tempo. */
    const pisca = (i * 7 + Math.floor(quadro / 18)) % 7 === 0;
    p.globalAlpha = pisca ? Math.min(0.85, base + 0.4) : base;
    p.fillStyle = BRANCO;
    p.fillRect(x, y, 3, 3);
  }
  p.globalAlpha = 1;
}

/**
 * As riscas do tubo, por cima de tudo. É o que separa "tela de fliperama" de
 * "cartaz colado no gabinete" a três metros de distância, que é de onde a
 * textura é vista.
 */
function riscas(p: Pincel) {
  p.fillStyle = "rgba(0,0,0,0.3)";
  for (let linha = 0; linha < ALTURA; linha += 6) p.fillRect(0, linha, LARGURA, 2);
}

/* O placar. Os números não são enfeite e nem inventados: saem de
   `content/hobby.ts` — as linhas de Lua do mod e a build do jogo em que ele
   roda. Se o mod crescer, o placar sobe junto. */
const RECORDE = mod.buildDoJogo.replace(/\D/g, "").slice(-5).padStart(6, "0");
const PONTOS_PARADO = String(mod.linhasDeLua).padStart(6, "0");

function placar(p: Pincel, pontos: string) {
  blocos(p, "1UP", 64, 40, 4, VERMELHO);
  blocos(p, pontos, 64, 82, 4, BRANCO);
  blocos(p, "HI-SCORE", LARGURA - 64 - larguraBlocos("HI-SCORE", 4), 40, 4, VERMELHO);
  blocos(p, RECORDE, LARGURA - 64 - larguraBlocos(RECORDE, 4), 82, 4, BRANCO);
}

/* ---------- a tela de atração ---------- */

/**
 * A tela de atração: os jogos, com o gabinete ligado e ninguém jogando.
 *
 * A lista é a mesma de `content/hobby.ts` que a seção "Fora do expediente"
 * mostra — o gabinete não inventa conteúdo próprio, ele é a versão de cenário
 * dela.
 *
 * `quadro` conta quadros de 60 Hz. Em 0 a tela sai exatamente como a textura
 * pintada, que é o estado em que o gabinete é visto de longe.
 */
export function desenharAtracao(
  p: Pincel,
  dict: Dictionary,
  locale: Locale,
  quadro: number,
  /** Linha de instrução no rodapé. Só o painel jogável passa. */
  comandos?: string,
) {
  fundo(p, quadro);
  placar(p, PONTOS_PARADO);

  /* O título com sombra deslocada, que é como todo gabinete resolvia dar
     relevo a uma letra chapada. */
  const titulo = dict.hobby.jogos;
  const xTitulo = (LARGURA - larguraBlocos(titulo, 10)) / 2;
  blocos(p, titulo, xTitulo + 8, 178, 10, "#6d1a5e", false);
  blocos(p, titulo, xTitulo, 170, 10, AMARELO);

  /* A formação marchando. Oito passos de ida e volta, com a perna trocando a
     cada passo: o vaivém de um gabinete parado. */
  const passo = Math.floor(quadro / 20) % 8;
  const ida = passo < 4 ? passo : 7 - passo;
  const desloca = (ida - 1.5) * 16;
  const desenhoBicho = passo % 2 === 0 ? INIMIGO : INIMIGO_B;
  [CIANO, MAGENTA, VERDE].forEach((cor, i) => {
    pixels(p, desenhoBicho, LARGURA / 2 - 27 + (i - 1) * 150 + desloca, 286, 5, cor);
  });

  /* A lista. Rótulo do grupo em ciano e menor, títulos em branco e maiores:
     a mesma hierarquia da seção rolável, com a régua de pixel no lugar da
     régua tipográfica. */
  let y = 352;
  for (const grupo of jogos) {
    blocos(p, grupo.rotulo[locale], 96, y, 4, CIANO);
    y += 42;
    for (const item of grupo.itens) {
      blocos(p, item, 128, y, 5, BRANCO);
      y += 46;
    }
    y += 22;
  }

  /* A nave e os dois tiros subindo. É o que impede a tela de virar lista com
     fundo preto. */
  p.fillStyle = AMARELO;
  p.fillRect(491, 950, 5, 22);
  p.fillRect(527, 962, 5, 22);
  pixels(p, NAVE, LARGURA / 2 - 33, 988, 6, CIANO);

  /* O convite piscando. Um segundo aceso, um apagado — o compasso de todo
     gabinete esperando ficha. */
  if (Math.floor(quadro / 34) % 2 === 0) {
    blocosCentrado(p, "INSERT COIN", LARGURA, 1074, 6, VERDE);
  }
  if (comandos) {
    blocosCentrado(p, comandos, LARGURA, 1130, 3, CIANO, false);
  }
  blocos(p, "CREDIT 01", 64, 1152, 3, BRANCO, false);

  riscas(p);
}

/* ---------- o jogo ---------- */

const COLUNAS = 6;
const FILAS = 4;
const BICHO_ESCALA = 5;
const BICHO_L = 11 * BICHO_ESCALA;
const BICHO_A = 8 * BICHO_ESCALA;
const ESPACO_X = 132;
const ESPACO_Y = 76;
const FORMACAO_X = (LARGURA - ((COLUNAS - 1) * ESPACO_X + BICHO_L)) / 2;
const FORMACAO_Y = 300;
/** Margem em que a formação vira. */
const BORDA = 50;
const PASSO_X = 16;
const PASSO_Y = 40;

const NAVE_ESCALA = 6;
const NAVE_L = 11 * NAVE_ESCALA;
const NAVE_A = 8 * NAVE_ESCALA;
const NAVE_Y = 1050;
const NAVE_VEL = 520;

const TIRO_VEL = 1250;
const TIRO_L = 5;
const TIRO_A = 24;
const BOMBA_VEL = 380;
const BOMBA_L = 5;
const BOMBA_A = 20;
const BOMBAS_NO_AR = 3;

const VIDAS = 3;
/** Ponto por fila, de cima para baixo: o de cima vale mais, como sempre. */
const VALOR = [30, 20, 10, 10];

export type Entrada = { esquerda: boolean; direita: boolean; tiro: boolean };

type Bicho = { x: number; y: number; fila: number; vivo: boolean };

export type Fase = "jogando" | "morrendo" | "fim" | "venceu";

export type Jogo = {
  fase: Fase;
  bichos: Bicho[];
  /** Para que lado a formação anda. */
  direcao: 1 | -1;
  relogioPasso: number;
  perna: 0 | 1;
  naveX: number;
  tiro: { x: number; y: number } | null;
  bombas: { x: number; y: number }[];
  relogioBomba: number;
  vidas: number;
  pontos: number;
  /** Congelamento depois de morrer, ganhar ou perder. */
  espera: number;
  quadro: number;
  /** Sobe a cada acontecimento que o leitor de tela precisa ouvir. */
  aviso: number;
};

export function novoJogo(): Jogo {
  const bichos: Bicho[] = [];
  for (let fila = 0; fila < FILAS; fila++) {
    for (let coluna = 0; coluna < COLUNAS; coluna++) {
      bichos.push({
        x: FORMACAO_X + coluna * ESPACO_X,
        y: FORMACAO_Y + fila * ESPACO_Y,
        fila,
        vivo: true,
      });
    }
  }
  return {
    fase: "jogando",
    bichos,
    direcao: 1,
    relogioPasso: 0,
    perna: 0,
    naveX: LARGURA / 2 - NAVE_L / 2,
    tiro: null,
    bombas: [],
    relogioBomba: 1.4,
    vidas: VIDAS,
    pontos: 0,
    espera: 0,
    quadro: 0,
    aviso: 0,
  };
}

function bate(
  ax: number,
  ay: number,
  al: number,
  aa: number,
  bx: number,
  by: number,
  bl: number,
  ba: number,
) {
  return ax < bx + bl && ax + al > bx && ay < by + ba && ay + aa > by;
}

/**
 * Um passo do jogo, com `dt` fixo.
 *
 * Fixo porque a colisão é por sobreposição de retângulos: com `dt` livre, um
 * quadro longo faz o tiro pular por cima do bicho inteiro e a bala atravessa.
 * Quem acumula o tempo real e chama isto quantas vezes couber é o painel.
 */
export function passo(jogo: Jogo, entrada: Entrada, dt: number) {
  jogo.quadro += 1;

  if (jogo.espera > 0) {
    jogo.espera -= dt;
    if (jogo.espera > 0) return;
    if (jogo.fase === "morrendo") {
      jogo.fase = "jogando";
      jogo.tiro = null;
      jogo.bombas = [];
      jogo.naveX = LARGURA / 2 - NAVE_L / 2;
    }
    return;
  }
  if (jogo.fase !== "jogando") return;

  /* A nave. */
  if (entrada.esquerda) jogo.naveX -= NAVE_VEL * dt;
  if (entrada.direita) jogo.naveX += NAVE_VEL * dt;
  jogo.naveX = Math.max(BORDA, Math.min(LARGURA - BORDA - NAVE_L, jogo.naveX));

  /* Um tiro de cada vez na tela, que é a regra que faz o jogo ter ritmo em
     vez de virar mangueira de balas. */
  if (entrada.tiro && !jogo.tiro) {
    jogo.tiro = { x: jogo.naveX + NAVE_L / 2 - TIRO_L / 2, y: NAVE_Y - TIRO_A };
  }
  if (jogo.tiro) {
    jogo.tiro.y -= TIRO_VEL * dt;
    if (jogo.tiro.y + TIRO_A < 140) jogo.tiro = null;
  }

  /* A formação anda em passos, não em pixels por segundo: é o "tec, tec" do
     gênero, e é ele que acelera conforme os bichos somem. */
  const vivos = jogo.bichos.filter((b) => b.vivo);
  const intervalo = 0.05 + 0.45 * (vivos.length / (COLUNAS * FILAS));
  jogo.relogioPasso += dt;
  if (jogo.relogioPasso >= intervalo) {
    jogo.relogioPasso -= intervalo;
    jogo.perna = jogo.perna === 0 ? 1 : 0;

    const esquerda = Math.min(...vivos.map((b) => b.x));
    const direita = Math.max(...vivos.map((b) => b.x)) + BICHO_L;
    const bateNaBorda =
      (jogo.direcao === 1 && direita + PASSO_X > LARGURA - BORDA) ||
      (jogo.direcao === -1 && esquerda - PASSO_X < BORDA);

    if (bateNaBorda) {
      jogo.direcao = jogo.direcao === 1 ? -1 : 1;
      for (const b of vivos) b.y += PASSO_Y;
    } else {
      for (const b of vivos) b.x += jogo.direcao * PASSO_X;
    }
  }

  /* As bombas caem de tempos em tempos, de uma coluna sorteada. */
  jogo.relogioBomba -= dt;
  if (jogo.relogioBomba <= 0 && jogo.bombas.length < BOMBAS_NO_AR && vivos.length) {
    const escolhido = vivos[Math.floor(Math.random() * vivos.length)];
    /* O mais baixo da coluna do sorteado: bomba vinda do meio da formação
       atravessaria os companheiros. */
    const atirador = escolhido
      ? vivos.reduce(
          (baixo, b) => (Math.abs(b.x - escolhido.x) < 1 && b.y > baixo.y ? b : baixo),
          escolhido,
        )
      : null;
    if (atirador) {
      jogo.bombas.push({
        x: atirador.x + BICHO_L / 2 - BOMBA_L / 2,
        y: atirador.y + BICHO_A,
      });
    }
    jogo.relogioBomba = 0.5 + Math.random() * 1.1;
  }
  for (const bomba of jogo.bombas) bomba.y += BOMBA_VEL * dt;
  jogo.bombas = jogo.bombas.filter((b) => b.y < ALTURA - 40);

  /* Tiro contra bicho. */
  if (jogo.tiro) {
    for (const bicho of vivos) {
      if (!bate(jogo.tiro.x, jogo.tiro.y, TIRO_L, TIRO_A, bicho.x, bicho.y, BICHO_L, BICHO_A)) {
        continue;
      }
      bicho.vivo = false;
      jogo.tiro = null;
      jogo.pontos += VALOR[bicho.fila] ?? 10;
      break;
    }
  }

  /* Bomba contra nave. */
  const atingida = jogo.bombas.some((b) =>
    bate(b.x, b.y, BOMBA_L, BOMBA_A, jogo.naveX, NAVE_Y, NAVE_L, NAVE_A),
  );
  /* Bicho encostando na altura da nave também é fim: deixar a formação passar
     por baixo transformaria a derrota em jogo sem fim. */
  const invadiu = vivos.some((b) => b.y + BICHO_A >= NAVE_Y);

  if (atingida || invadiu) {
    jogo.vidas -= invadiu ? jogo.vidas : 1;
    jogo.aviso += 1;
    if (jogo.vidas <= 0) {
      jogo.vidas = 0;
      jogo.fase = "fim";
      jogo.espera = 3.5;
    } else {
      jogo.fase = "morrendo";
      jogo.espera = 1.1;
    }
    return;
  }

  if (!vivos.length) {
    jogo.fase = "venceu";
    jogo.espera = 3.5;
    jogo.aviso += 1;
  }
}

/** Desenha o estado do jogo. */
export function desenharJogo(p: Pincel, jogo: Jogo) {
  fundo(p, jogo.quadro);
  placar(p, String(jogo.pontos).padStart(6, "0"));

  const desenhoBicho = jogo.perna === 0 ? INIMIGO : INIMIGO_B;
  const coresDaFila = [MAGENTA, AMARELO, CIANO, VERDE];
  for (const bicho of jogo.bichos) {
    if (!bicho.vivo) continue;
    pixels(p, desenhoBicho, bicho.x, bicho.y, BICHO_ESCALA, coresDaFila[bicho.fila] ?? CIANO);
  }

  if (jogo.tiro) {
    p.fillStyle = AMARELO;
    p.fillRect(jogo.tiro.x, jogo.tiro.y, TIRO_L, TIRO_A);
  }
  p.fillStyle = VERMELHO;
  for (const bomba of jogo.bombas) p.fillRect(bomba.x, bomba.y, BOMBA_L, BOMBA_A);

  /* A nave pisca enquanto está morrendo, e some de vez no fim. */
  const some = jogo.fase === "fim" || (jogo.fase === "morrendo" && jogo.quadro % 8 < 4);
  if (!some) pixels(p, NAVE, jogo.naveX, NAVE_Y, NAVE_ESCALA, CIANO);

  /* As vidas que sobram, desenhadas como naves no rodapé: é o placar que não
     precisa de legenda. Ficam na esquerda, com o
     "CREDIT 01", logo abaixo — é o canto do gabinete que sempre foi do
     jogador. À direita elas caíam embaixo do botão de fechar do painel. */
  for (let i = 0; i < jogo.vidas - 1; i++) {
    pixels(p, NAVE, 64 + i * 60, ALTURA - 82, 4, CIANO, false);
  }

  if (jogo.fase === "fim") {
    blocosCentrado(p, "GAME OVER", LARGURA, 600, 9, VERMELHO);
  } else if (jogo.fase === "venceu") {
    blocosCentrado(p, "STAGE CLEAR", LARGURA, 560, 8, VERDE);
    blocosCentrado(p, String(jogo.pontos).padStart(6, "0"), LARGURA, 660, 6, AMARELO);
  }

  /* A linha de rodapé continua sendo a do gabinete: quem está jogando é o
     mesmo que estava lendo a lista um segundo atrás. */
  blocos(p, "CREDIT 01", 64, ALTURA - 34, 3, BRANCO, false);

  riscas(p);
}
