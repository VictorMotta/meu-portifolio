/**
 * Os pontos de parada da câmera dentro da ilha.
 *
 * Cada item da navegação leva a um objeto real da cena: "Sobre" é a tela do
 * monitor, "Projetos" é o quadro de kanban, "Mods" é a TV da área gamer. A
 * câmera voa até lá e o conteúdo aparece por cima, encaixado no lugar da tela.
 *
 * `alvo` é o nome do mesh na cena (todos têm nome, vindos de `cena.ts`).
 * `frente` é a direção para onde essa tela aponta, em coordenadas locais do
 * objeto: o quadro branco tem o painel fino no eixo X com os rabiscos em +X,
 * então a frente dele é +X. Em tempo de execução essa direção é rotacionada
 * pela matriz do mundo, então não importa como o grupo foi girado na cena.
 */

export type ChavePonto =
  | "sobre"
  | "stack"
  | "projetos"
  | "mods"
  | "jogos"
  | "contato"
  | "curriculo";

/**
 * O material da superfície onde o conteúdo pousa. É o que faz cada parada
 * parecer o objeto que ela é, em vez de a mesma janela flutuando seis vezes.
 */
export type Superficie = "tela" | "quadro" | "lousa" | "papel" | "fliperama";

export type Ponto = {
  chave: ChavePonto;
  superficie: Superficie;
  /** Nome do mesh que a câmera enquadra. */
  alvo: string;
  /** Normal da face visível, em coordenadas locais do objeto. */
  frente: [number, number, number];
  /**
   * Distância da câmera até a tela, em múltiplos da altura da tela. Quanto
   * maior, mais "de longe" — usado para deixar sobrar moldura em volta do
   * painel de conteúdo.
   */
  recuo: number;
  /** Deslocamento vertical da câmera em relação ao centro da tela. */
  altura: number;
  /** Fração da altura da tela ocupada pelo painel (o resto vira moldura). */
  ocupacao: number;
};

export const PONTOS: Record<ChavePonto, Ponto> = {
  /* Monitor da esquerda: a tela onde o "Sobre" é lido. */
  sobre: {
    chave: "sobre",
    superficie: "tela",
    alvo: "monitor_left_screen",
    frente: [1, 0, 0],
    /* O painel pousa no retângulo da tela, então é o recuo que decide quanto
       conteúdo cabe. O -0,03 desce a mira 3 cm, e descer a mira sobe o objeto
       na imagem: é isso que abre embaixo o espaço onde o pedestal, a mesa e as
       fitas de LED aparecem — a parte que dá a imersão.

       0,95 saiu de tentativa, não de conta. Abaixo de 0,93 a tela passa a ser
       maior que a janela: o painel é aparado nas margens e o texto pintado na
       textura do monitor 3D reaparece nas bordas, em dobro. E a queda é
       abrupta entre 0,93 e 0,88, sinal de que ali entra o desvio de obstáculo
       da câmera, que a joga para muito mais perto de uma vez. 0,95 fica do
       lado seguro do degrau, com folga para outras proporções de janela. */
    recuo: 0.86,
    altura: -0.03,
    ocupacao: 1,
  },
  /* Quadro branco: as anotações de stack. */
  stack: {
    chave: "stack",
    superficie: "lousa",
    alvo: "whiteboard_panel",
    frente: [1, 0, 0],
    recuo: 1.45,
    altura: 0,
    ocupacao: 0.97,
  },
  /* Quadro de projetos: o kanban com os cards. */
  projetos: {
    chave: "projetos",
    superficie: "quadro",
    alvo: "project_board_panel",
    frente: [0, 0, 1],
    recuo: 1.4,
    altura: 0,
    ocupacao: 0.98,
  },
  /* TV da área gamer: os mods e os jogos. */
  mods: {
    chave: "mods",
    superficie: "tela",
    alvo: "tv_screen",
    frente: [-1, 0, 0],
    recuo: 1.45,
    altura: 0,
    ocupacao: 1,
  },
  /* Tela do fliperama: os jogos.
     Parada só de clique, como o currículo — não entra em `ORDEM_PONTOS` nem
     na navegação, que já tem cinco itens. Antes o fliperama levava a "mods",
     e clicar nele voava para a TV do outro lado da sala: o visitante clicava
     num gabinete e chegava numa televisão.

     `frente` é [0,0,1] porque a chapa está deitada 23° para trás, e a normal
     dela é o +Z LOCAL depois desse giro — a matriz do mundo faz o resto. E a
     tela é em pé (0,50 x 0,59), a única da ilha: o recuo é maior que o da TV
     porque numa tela alta e estreita quem estoura primeiro é a largura. */
  jogos: {
    chave: "jogos",
    /* Superfície própria, e é a única da ilha que não é Dracula: o painel
       daqui é a tela do gabinete, preta e em letra de bloco. Ver
       `.sup-fliperama` no globals.css. */
    superficie: "fliperama",
    alvo: "arcade_screen",
    frente: [0, 0, 1],
    recuo: 1.6,
    altura: 0,
    ocupacao: 0.97,
  },
  /* Monitor da direita: o formulário de contato. O notebook da mesa também
     tem tela, mas ela é pequena e inclinada — um formulário com anexo não
     cabe ali sem virar letra miúda. */
  contato: {
    chave: "contato",
    superficie: "tela",
    alvo: "monitor_right_screen",
    frente: [1, 0, 0],
    /* Mesmo enquadramento do monitor da esquerda: ver `sobre`. */
    recuo: 0.86,
    altura: -0.03,
    ocupacao: 1,
  },
  /* Cavalete: a folha do currículo. */
  curriculo: {
    chave: "curriculo",
    superficie: "papel",
    alvo: "resume_sheet",
    frente: [0, 0, 1],
    recuo: 1.5,
    altura: 0,
    ocupacao: 0.97,
  },
};

export const ORDEM_PONTOS: ChavePonto[] = [
  "sobre",
  "stack",
  "projetos",
  "mods",
  "contato",
];
