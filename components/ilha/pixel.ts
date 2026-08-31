/**
 * A fonte de blocos e os bonecos do fliperama.
 *
 * Vive fora de `texturas.ts` porque tem dois consumidores: a textura pintada
 * na tela do 3D, que é desenhada em canvas, e o painel que pousa nessa tela
 * quando a câmera chega, que monta os mesmos bonecos em SVG. Um alfabeto em
 * cada lugar viraria duas fontes diferentes na mesma tela em duas distâncias.
 */

export type Pincel = CanvasRenderingContext2D;

/* ---------- a fonte de blocos do fliperama ---------- */

/**
 * Um alfabeto 5 x 7 desenhado à mão, pixel a pixel.
 *
 * O gabinete não podia usar a JetBrains Mono das outras telas: letra
 * vetorial, com curva e antisserrilhado, não parece jogo de 1982 — parece
 * legenda. E uma fonte de pixel baixada não resolveria do lado do 3D: a
 * textura é pintada uma vez, no primeiro quadro, e se a fonte ainda não
 * tiver chegado o canvas cai calado na fonte de sistema e a tela sai errada,
 * sem erro nenhum para avisar. Com os glifos desenhados como retângulos, o
 * resultado é o mesmo em qualquer máquina e já no primeiro quadro.
 *
 * No painel de HTML a conta é outra e o texto é texto de verdade, com a
 * Press Start 2P servida pelo próprio domínio: lá quem lê pode selecionar,
 * ampliar e ouvir o conteúdo, e uma fonte que demora não quebra nada.
 *
 * Só maiúsculas, dígitos e a pontuação que os títulos usam — que é o que
 * cabia na ROM de caracteres de um gabinete da época.
 */
export const GLIFOS: Record<string, string> = {
  " ": "..... ..... ..... ..... ..... ..... .....",
  A: ".###. #...# #...# ##### #...# #...# #...#",
  B: "####. #...# #...# ####. #...# #...# ####.",
  C: ".###. #...# #.... #.... #.... #...# .###.",
  D: "####. #...# #...# #...# #...# #...# ####.",
  E: "##### #.... #.... ####. #.... #.... #####",
  F: "##### #.... #.... ####. #.... #.... #....",
  G: ".###. #...# #.... #.### #...# #...# .####",
  H: "#...# #...# #...# ##### #...# #...# #...#",
  I: "##### ..#.. ..#.. ..#.. ..#.. ..#.. #####",
  J: "..### ...#. ...#. ...#. ...#. #..#. .##..",
  K: "#...# #..#. #.#.. ##... #.#.. #..#. #...#",
  L: "#.... #.... #.... #.... #.... #.... #####",
  M: "#...# ##.## #.#.# #.#.# #...# #...# #...#",
  N: "#...# ##..# #.#.# #..## #...# #...# #...#",
  O: ".###. #...# #...# #...# #...# #...# .###.",
  P: "####. #...# #...# ####. #.... #.... #....",
  Q: ".###. #...# #...# #...# #.#.# #..#. .##.#",
  R: "####. #...# #...# ####. #.#.. #..#. #...#",
  S: ".#### #.... #.... .###. ....# ....# ####.",
  T: "##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..",
  U: "#...# #...# #...# #...# #...# #...# .###.",
  V: "#...# #...# #...# #...# #...# .#.#. ..#..",
  W: "#...# #...# #...# #.#.# #.#.# ##.## #...#",
  X: "#...# #...# .#.#. ..#.. .#.#. #...# #...#",
  Y: "#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..",
  Z: "##### ....# ...#. ..#.. .#... #.... #####",
  0: ".###. #...# #..## #.#.# ##..# #...# .###.",
  1: "..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.",
  2: ".###. #...# ....# ...#. ..#.. .#... #####",
  3: "##### ...#. ..#.. ...#. ....# #...# .###.",
  4: "...#. ..##. .#.#. #..#. ##### ...#. ...#.",
  5: "##### #.... ####. ....# ....# #...# .###.",
  6: "..##. .#... #.... ####. #...# #...# .###.",
  7: "##### ....# ...#. ..#.. .#... .#... .#...",
  8: ".###. #...# #...# .###. #...# #...# .###.",
  9: ".###. #...# #...# .#### ....# ...#. .##..",
  ":": "..... ..#.. ..#.. ..... ..#.. ..#.. .....",
  ".": "..... ..... ..... ..... ..... .##.. .##..",
  ",": "..... ..... ..... ..... .##.. .##.. .#...",
  "-": "..... ..... ..... ##### ..... ..... .....",
  "!": "..#.. ..#.. ..#.. ..#.. ..#.. ..... ..#..",
  "?": ".###. #...# ....# ...#. ..#.. ..... ..#..",
  "'": "..#.. ..#.. .#... ..... ..... ..... .....",
  "/": "....# ...#. ...#. ..#.. .#... .#... #....",
  "&": ".##.. #..#. #.#.. .##.. #.#.# #..#. .##.#",
};

/** Falta de glifo vira quadrado vazado: um buraco visível é melhor que uma
    letra que some calada no meio do título. */
export const TOFU = "##### #...# #...# #...# #...# #...# #####";

/** 5 colunas de glifo mais 1 de folga. */
export const AVANCO = 6;

/**
 * Caixa alta e sem acento.
 *
 * A ROM de caracteres de um fliperama não tinha Ê nem Ç, e "SOBREVIVENCIA"
 * na tela é mais da época do que um acento desenhado a lápis. O texto com
 * acento continua inteiro no painel de HTML, que é o que leitor de tela e
 * busca leem — aqui é miniatura.
 */
export function semAcento(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

/**
 * Desenha uma grade de "#" e "." como pixels quadrados.
 *
 * O brilho é uma segunda passada, por baixo, com os quadrados maiores e
 * translúcidos: é o sangramento do fósforo do tubo. Sai mais barato que
 * `shadowBlur`, que aqui custaria um borrão por pixel desenhado.
 */
export function pixels(
  p: Pincel,
  linhas: string[],
  x: number,
  y: number,
  escala: number,
  cor: string,
  brilho = true,
) {
  const passadas: [number, number][] = brilho
    ? [[0.28, escala * 0.5], [1, 0]]
    : [[1, 0]];

  for (const [alfa, folga] of passadas) {
    p.globalAlpha = alfa;
    p.fillStyle = cor;
    linhas.forEach((linha, l) => {
      for (let coluna = 0; coluna < linha.length; coluna++) {
        if (linha[coluna] !== "#") continue;
        p.fillRect(
          x + coluna * escala - folga,
          y + l * escala - folga,
          escala + folga * 2,
          escala + folga * 2,
        );
      }
    });
  }
  p.globalAlpha = 1;
}

export function larguraBlocos(texto: string, escala: number) {
  return semAcento(texto).length * AVANCO * escala - escala;
}

/** Escreve na fonte de blocos. `y` é o topo da letra, não a linha de base. */
export function blocos(
  p: Pincel,
  texto: string,
  x: number,
  y: number,
  escala: number,
  cor: string,
  brilho = true,
) {
  [...semAcento(texto)].forEach((letra, i) => {
    const glifo = GLIFOS[letra] ?? TOFU;
    pixels(p, glifo.split(" "), x + i * AVANCO * escala, y, escala, cor, brilho);
  });
}

export function blocosCentrado(
  p: Pincel,
  texto: string,
  /** Largura em que centralizar — a da tela, não a do texto. */
  largura: number,
  y: number,
  escala: number,
  cor: string,
  brilho = true,
) {
  blocos(p, texto, (largura - larguraBlocos(texto, escala)) / 2, y, escala, cor, brilho);
}

/* As duas peças de cenário da tela: quem atira embaixo e quem desce em cima. */
export const NAVE = [
  ".....#.....",
  "....###....",
  "....###....",
  "..#######..",
  ".#########.",
  "##.#####.##",
  "##.......##",
  "#.........#",
];

export const INIMIGO = [
  "..#.....#..",
  "...#...#...",
  "..#######..",
  ".##.###.##.",
  "###########",
  "#.#######.#",
  "#.#.....#.#",
  "...##.##...",
];
