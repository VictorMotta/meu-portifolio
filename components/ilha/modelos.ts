import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

import { TOPO_DAS_TABUAS } from "@/components/ilha/cena";
import type { Descartaveis } from "@/components/ilha/texturas";

/**
 * Modelos .glb que entram na ilha por cima da geometria gerada.
 *
 * Por que um arquivo separado de `cena.ts`: aquele arquivo é exportado do
 * Claude Design e traz um aviso de "não reescrever à mão" — uma reexportação
 * apagaria qualquer modelo enfiado lá dentro. Aqui o modelo é pendurado num
 * grupo existente pelo nome, do mesmo jeito que `texturas.ts` pinta as telas
 * pelo nome: a cena continua reexportável e isto sobrevive.
 *
 * O encaixe é declarado, não medido no olho. Cada modelo diz em que caixa ele
 * tem de caber, em unidades da ilha (metros), e o carregador faz a conta: gira,
 * mede a caixa envolvente já girada, escala para o alvo e apoia a base no
 * chão. Assim um modelo em centímetros, com a origem no meio do volume ou
 * deitado no eixo errado — os três defeitos comuns de exportação — entra
 * certo sem ninguém catar número na mão.
 */

export type Encaixe = {
  /** Arquivo dentro de /public/modelos. */
  arquivo: string;
  /** Grupo da cena que recebe o modelo. */
  pai: string;
  /** Peças geradas que este modelo substitui: ficam invisíveis. */
  substitui: string[];
  /**
   * Peça desenhada que FICA, mas muda de lugar para casar com o modelo.
   *
   * A tela do fliperama é o caso. O arquivo dele é uma malha só, com um
   * material só — a tela, o gabinete e o painel de controle estão todos na
   * mesma textura, e não há por onde pintar só o retângulo da tela. Então a
   * chapa desenhada `arcade_screen` continua na cena, como a `tv_screen`
   * continua encostada na frente da TV, e é nela que `texturas.ts` escreve.
   *
   * O que não dá para reaproveitar é o LUGAR: a tela do arquivo não está
   * onde a do gabinete desenhado estava, nem no mesmo eixo. Os números vêm de
   * raio lançado contra o modelo já montado e convertido para os eixos do
   * grupo — é medida, não chute —, e voltam ao que eram no descarte.
   */
  recoloca?: Record<string, {
    posicao: [number, number, number];
    giro: [number, number, number];
    escala: [number, number, number];
  }>;
  /**
   * A caixa que o modelo deve ocupar, nos eixos locais do pai, em metros.
   * `proporcional` faz o modelo caber dentro dela sem distorcer, o que quase
   * sempre sobra espaço em algum eixo.
   */
  alvo: { x: number; y: number; z: number };
  /** Centro da base do modelo, nos eixos locais do pai. */
  base: [number, number, number];
  /** Giro em torno do Y, aplicado antes de medir. */
  giroY?: number;
  /**
   * Giro em torno do Y aplicado DEPOIS do encaixe. Separado do `giroY` porque
   * este não pode mexer na medida: girar antes muda a caixa envolvente e o
   * modelo sai de outro tamanho para preencher o mesmo alvo.
   */
  giroFinalY?: number;
  proporcional?: boolean;
  /**
   * Escala fixa, para modelo que já veio no tamanho certo. Ignora o `alvo`:
   * encaixar um MacBook na caixa do notebook desenhado o esticaria em 60%.
   */
  escala?: number;
  /**
   * Malha do modelo que assume o nome de uma peça da cena. É o que mantém a
   * câmera e o texto funcionando: `pontos.ts` enquadra `monitor_left_screen`
   * e `texturas.ts` pinta esse mesmo nome. Trocar o monitor sem passar o nome
   * adiante deixaria a câmera mirando um objeto invisível e o "Sobre" sem
   * onde ser escrito. A peça antiga recebe o sufixo `_desenhado`, senão
   * `getObjectByName` acha as duas e devolve a errada.
   */
  renomeia?: Record<string, string>;
  /**
   * Não projeta sombra. Reservado para malha densa: o mapa de sombra desenha
   * a cena inteira de novo, então um monitor de 219 mil triangulos custa
   * dobrado enquanto a sombra dele, atrás do próprio monitor, não aparece.
   */
  semSombra?: boolean;
  /**
   * Cor nova por nome de material do arquivo. Serve para o modelo entrar na
   * paleta da ilha sem precisar abrir o .glb num editor.
   *
   * Os materiais originais não são tocados: eles vivem no cache, e a cadeira
   * poderia voltar tingida numa remontagem. Cada um vira uma cópia, uma só
   * por material, compartilhada entre as malhas que o usavam.
   */
  recolorir?: Record<string, string | { cor: string; metal?: number; aspereza?: number }>;
  /**
   * Cor nova por peça solta da malha, para quando o material não separa nada.
   *
   * O sofá é uma malha só com um material só: pelo nome do material não há
   * como pintar as almofadas de outra cor. Só que as peças dele são ilhas de
   * geometria que não se encostam — as três almofadas soltas são três dessas
   * —, e é por aí que a seleção vai. Cada regra pinta as ilhas que cabem
   * INTEIRAS dentro da caixa; ilha que só encosta na caixa fica de fora, o
   * que evita pegar meia almofada.
   *
   * A caixa é dada em fração do volume da malha e nos eixos crus do arquivo,
   * antes do `giroY` e antes do próprio nó do glTF — que é o espaço em que os
   * vértices estão guardados. Num arquivo Z-para-cima, como o do sofá, o eixo
   * da altura é o Z e não o Y.
   */
  /**
   * Empresta o material de outro arquivo: textura, cor e acabamento juntos.
   *
   * O `recolorir` troca só a cor, e cor sozinha não faz duas madeiras
   * parecerem a mesma. A estante de nichos é um tom chapado sem textura
   * nenhuma; as de livros têm um mapa de veio. Igualar o número da cor
   * deixaria uma lisa ao lado de duas com desenho.
   *
   * O arquivo emprestado passa pelo mesmo cache dos outros, então pedir
   * emprestado a um modelo que já está na cena não baixa nada de novo — e o
   * material continua sendo o do dono, compartilhado, não uma cópia.
   */
  materialDe?: {
    arquivo: string;
    material: string;
    /**
     * Quais materiais DESTE modelo dão lugar ao emprestado. Sem isto, todos.
     *
     * A estante de livros precisa: o arquivo dela tem a madeira e os livros, e
     * emprestar a madeira para os dois deixaria as fileiras de livros com cara
     * de tábua.
     */
    troca?: string[];
  };
  recolorirIlhas?: {
    dentro: { x?: [number, number]; y?: [number, number]; z?: [number, number] };
    cor: string;
    metal?: number;
    aspereza?: number;
  }[];
  /**
   * Refaz a UV das malhas renomeadas como um plano sobre a face.
   *
   * O whiteboard tem UV, mas não uma que abra a face do quadro em 0..1 — é a
   * UV de um modelo que nunca foi texturizado. Pintar nela dá uma cor chapada:
   * a textura inteira colapsa num punhado de texels. Com o plano refeito a
   * partir da caixa da geometria, o desenho cobre a face.
   */
  uvPlano?: boolean;
  /**
   * Reescreve a UV como projeção em caixa, com esta medida em metros por volta
   * da textura.
   *
   * Para modelo cuja UV não foi feita para textura. A da estante de nichos vai
   * de 0 a 0,625 num eixo e passa de 2 no outro: cada face pega um pedaço
   * diferente do veio, e os nichos saem partidos em triângulos de tom
   * diferente. Projetando, o veio corre igual pela peça inteira.
   *
   * A medida é em metros do mundo, não em fração da malha, para o veio sair do
   * mesmo tamanho em móveis que entraram com escalas diferentes.
   */
  uvCaixa?: number;
  /** Prefixo dos nomes das malhas, para elas não colidirem com as da cena. */
  prefixo: string;
};

/* ---------- a madeira dos móveis ---------- */

/**
 * O tom da madeira, um só para todos.
 *
 * A cor MULTIPLICA a textura, então não é a cor final: o pixel médio do
 * arquivo é #a47c59 e este tom o escurece para o marrom que se vê.
 */
const TOM_DA_MADEIRA = { cor: "#6b4c33", metal: 0, aspereza: 0.8 };

/**
 * A madeira única dos móveis, emprestada da mesa de centro.
 *
 * Dos arquivos daqui, o da mesa de centro é o único com um veio de madeira de
 * verdade — e ainda por cima uniforme e sem emenda, o que o faz cair bem em
 * qualquer UV, inclusive nas que não são a dele. O da estante de livros é veio
 * também, mas mais escuro e chapado; o do móvel da TV e o da estante de nichos
 * não têm textura nenhuma, são cor lisa.
 *
 * A mesa de centro não pede emprestado porque é a dona. A mesa do computador
 * fica de fora de propósito: ela é preta, não é móvel de madeira.
 *
 * `troca` existe por causa da estante de livros, cujo arquivo traz a madeira e
 * os livros no mesmo modelo.
 */
const ARQUIVO_DA_MADEIRA = "/modelos/coofe_table.glb";
const MATERIAL_DA_MADEIRA = "Material";

/*
 * Quantos metros de piso cabem numa volta da textura.
 *
 * As tábuas têm 0,44 de largura, então dois metros dão pouco mais de quatro
 * fileiras por volta do veio — perto o bastante para o desenho não se repetir
 * na cara de quem olha, largo o bastante para não virar listra.
 */
const METROS_POR_VOLTA_NO_PISO = 2.0;

const madeira = (troca?: string[]): Pick<Encaixe, "materialDe" | "recolorir"> => ({
  materialDe: { arquivo: ARQUIVO_DA_MADEIRA, material: MATERIAL_DA_MADEIRA, troca },
  recolorir: { Material: TOM_DA_MADEIRA },
});

/**
 * A mesa gamer entra no lugar do tampo desenhado.
 *
 * A caixa alvo é a da mesa original (0,85 x 2,0, tampo a 0,76 m), e não o
 * tamanho "certo" de uma mesa: monitores, notebook, teclado, mouse e caneca
 * já estão posicionados em relação a ela dentro do grupo `desk`. Encolher o
 * móvel para a proporção real do modelo deixaria os monitores no ar, fora da
 * borda.
 *
 * O modelo tem 3,59 x 1,67 x 1,89 e vem deitado no eixo errado: o lado
 * comprido dele é o X, e na ilha o comprimento da mesa é o Z. Daí o giro de
 * 90 graus antes de medir.
 */
export const MESA_GAMER: Encaixe = {
  arquivo: "/modelos/gaming_table.glb",
  pai: "desk",
  substitui: ["desk_top", "desk_edge_light", "desk_leg_1", "desk_leg_2", "desk_leg_3", "desk_leg_4"],
  /* 0,8177 de altura, e não 0,76, porque o `alvo` mede a CAIXA ENVOLVENTE e o
     ponto mais alto deste modelo não é a superfície de trabalho — acima dela
     ainda há borda. Medido na cena, amostrando os triângulos da própria malha
     da mesa por baixo de cada objeto, a superfície fica a 92,94% da altura da
     caixa. Então 0,76 / 0,9294 = 0,8177 põe a superfície exatamente em 0,760,
     que é onde o tampo desenhado terminava e onde a cena inteira espera
     apoiar as coisas.

     Não deduza esse número lendo vértice: eu tentei duas vezes e errei as
     duas. Num modelo low-poly o tampo é um quadrilátero sem vértice nenhum no
     miolo, e a leitura pelos extremos pega borda, não superfície. O jeito
     certo é perguntar à malha a altura num (x, z) concreto. */
  alvo: { x: 0.85, y: 0.8177, z: 2.0 },
  base: [0, 0, 0],
  giroY: Math.PI / 2,
  prefixo: "mesa_gamer",
};

/**
 * O MacBook entra com escala 1: o modelo já veio no tamanho de um de verdade
 * (0,313 x 0,210 x 0,300 m).
 *
 * Ele é uma malha só, com a tela dentro do mesmo atlas de textura do resto do
 * corpo. Não há como pintar nela, então o terminal zsh que `texturas.ts`
 * escrevia em `macbook_screen` se perde e fica o papel de parede do macOS que
 * veio no modelo. É o preço deste arquivo, não um defeito do encaixe.
 */
export const MACBOOK: Encaixe = {
  arquivo: "/modelos/apple_macbook_pro.glb",
  pai: "macbook",
  substitui: [
    "macbook_base", "macbook_deck", "macbook_keys", "macbook_trackpad",
    "macbook_hinge", "macbook_lid", "macbook_screen", "macbook_notch", "macbook_foot",
  ],
  alvo: { x: 0.34, y: 0.36, z: 0.5 },
  escala: 1,
  /* O grupo `macbook` da cena nasce em x = 0,44, que na mesa desenhada era o
     tampo e na mesa gamer é ar: a chapa do modelo cobre de -0,424 a +0,312 e
     para antes da borda da frente. Sem recuar, o notebook fica pendurado fora
     da mesa. -0,25 o encaixa nos 29,7 cm que sobram entre a frente do console
     elevado (0,040) e a borda da mesa (0,337). O MacBook tem 30 cm: sobra
     1,5 mm de cada lado, e é por isso que o número não é redondo. -0,005
     apoia a base na superfície de trabalho, em 0,760. */
  base: [-0.25, -0.005, 0],
  giroY: Math.PI / 2,
  prefixo: "macbook_modelo",
};

/**
 * Os dois monitores ultrawide.
 *
 * O grupo `monitor_left` já carrega a posição na mesa e o giro de 0,26 rad
 * para dentro, então pendurar o modelo nele dá o "virado para o MacBook" de
 * graça — o mesmo enquadramento que a cena desenhada já tinha.
 *
 * A tela do modelo é um quadrado de dois triangulos com material próprio, o
 * que a torna um alvo de pintura tão bom quanto a caixa que ela substitui.
 */
function monitor(lado: "left" | "right"): Encaixe {
  return {
    arquivo: "/modelos/ultrawide_monitor.glb",
    pai: `monitor_${lado}`,
    substitui: [
      `monitor_${lado}_bezel`, `monitor_${lado}_screen`,
      `monitor_${lado}_post`, `monitor_${lado}_foot`,
    ],
    renomeia: { "Ultrawide Monitor_Screen_0": `monitor_${lado}_screen` },
    /* A largura é quem manda: 0,78 m de tela, com altura e profundidade
       sobrando na caixa para o modelo não ser espremido. */
    alvo: { x: 0.25, y: 0.55, z: 0.78 },
    proporcional: true,
    /* -0,245 em X encosta a tela no fundo da chapa (que termina em -0,424),
       liberando a frente inteira para o MacBook — sem isso os dois disputam
       os mesmos 30 cm e se atravessam.

       Os -0,03 em Y encostam o pé na superfície: o grupo `monitor_*` da cena
       nasce em 0,79 e a superfície da mesa está em 0,760.
       -0,03 em Y encosta o pé no tampo: o grupo `monitor_*` da cena nasce em
       y=0,79 e o tampo da mesa gamer termina em 0,76, então o monitor ficava
       3 cm no ar. Com o pezinho desenhado ninguém via; com o pedestal do
       ultrawide, flutua à vista. */
    base: [-0.245, -0.03, 0],
    giroY: Math.PI / 2,
    /* O grupo da cena já gira 0,26 rad, mas para FORA: girar +X por +0,26
       aponta a normal para -Z, que em `monitor_left` (z = -0,56) é para longe
       do centro da mesa. Os 0,52 aqui cancelam esse giro e o invertem, então
       as duas telas passam a olhar para dentro, na direção do MacBook. */
    giroFinalY: lado === "left" ? -0.52 : 0.52,
    semSombra: true,
    prefixo: `monitor_${lado}_modelo`,
  };
}

export const MONITOR_ESQ = monitor("left");
export const MONITOR_DIR = monitor("right");

/**
 * A cadeira gamer. O grupo `gaming_chair` da cena já está posicionado e
 * virado para a mesa (rotation.y = -1,45), então o modelo só precisa nascer
 * olhando para o mesmo lado que a cadeira desenhada olhava.
 */
export const CADEIRA: Encaixe = {
  arquivo: "/modelos/gaming_chair.glb",
  pai: "gaming_chair",
  substitui: [
    "chair_seat", "chair_cushion", "chair_back", "chair_back_stripe",
    "chair_headrest", "chair_post",
    "chair_arm_1", "chair_arm_2", "chair_arm_3", "chair_arm_4", "chair_arm_5",
    "chair_wheel_1", "chair_wheel_2", "chair_wheel_3", "chair_wheel_4", "chair_wheel_5",
    "chair_armrest_1", "chair_armrest_2", "chair_armpad_1", "chair_armpad_2",
  ],
  alvo: { x: 1.2, y: 1.25, z: 1.2 },
  proporcional: true,
  base: [0, 0, 0],
  giroY: 0,
  semSombra: true,
  /* Preta, com os dois acentos em azul-noite do Dracula.
     O modelo vem com amarelo (`Material.002`) e laranja (`Material`) — 80 mil
     dos 158 mil triângulos, ou seja, a maior parte do que se vê. Os dois vão
     para o mesmo azul: no arquivo são peças diferentes (a costura e o
     estofado), mas na cadeira formam um acento só.
     O resto vai a preto, incluindo a estrela da base, que era prata. */
  recolorir: {
    "Material.002": { cor: "#4a5a96", metal: 0.15, aspereza: 0.55 },
    "Material": { cor: "#4a5a96", metal: 0.05, aspereza: 0.65 },
    "Material.001": "#0d0d11",
    "Material.003": "#1a1a1f",
    "Material.004": "#08080a",
    "material_0": "#0d0d11",
  },
  prefixo: "cadeira_modelo",
};

/**
 * Peças desenhadas que saem de cena sem nada entrar no lugar.
 *
 * Some o grupo inteiro, não a peça: a caneca é `mug` com corpo, alça e café
 * dentro, e esconder só o corpo deixaria a alça no ar.
 */
export const ESCONDIDOS = [
  "mug",
  "desk_lamp",
  "keyboard",
  "keyboard_keys",
  "keyboard_underglow",
  "mouse",
  /* Os dois controles de videogame: um em cima da mesa de centro, outro
     caído no chão ao lado do sofá. */
  "gamepad_1",
  "gamepad_2",
];

/* ---------- zona gamer ---------- */

/** O sofá. A largura corre no Z da cena, daí o quarto de volta. */
export const SOFA: Encaixe = {
  arquivo: "/modelos/sofa.glb",
  pai: "sofa",
  substitui: [
    "sofa_base", "sofa_back", "sofa_arm_1", "sofa_arm_2",
    "sofa_seat_cushion_1", "sofa_seat_cushion_2",
    "sofa_back_cushion_1", "sofa_back_cushion_2",
    "throw_pillow",
    "sofa_foot_1", "sofa_foot_2", "sofa_foot_3", "sofa_foot_4",
  ],
  /* O Z é o eixo que aperta (3,2 / 2,03 do arquivo é a menor das três razões),
     então é ele que manda no tamanho: o sofá sai com 3,2 de comprimento, 1,33
     de profundidade e 1,13 de altura. O X e o Y estão folgados de propósito —
     apertados, seria um deles a mandar e o comprimento não cresceria. */
  alvo: { x: 1.5, y: 1.35, z: 3.2 },
  proporcional: true,
  /* Recuado junto com o crescimento, e é o recuo que dá o espaço para crescer:
     as costas param a 0,19 da frente das estantes e a mesa de centro, que
     começa em x = -0,225 no grupo da zona gamer, fica 0,31 à frente. Sem
     recuar, o sofá mais fundo passaria por cima dela. */
  base: [-0.45, 0, 0],
  giroY: Math.PI / 2,
  /* O tecido tem textura, então a cor MULTIPLICA o desenho dela em vez de
     substituí-lo: por isso os tons escolhidos são bem mais claros do que o
     resultado final. O pixel da textura é #6b7378, o que corta pela metade
     tudo que se pede aqui. O metalness vinha 1,0 no arquivo — tecido
     metálico —, o que lavava a textura toda. */
  recolorir: { "Scene_-_Root": { cor: "#2a2a2f", metal: 0, aspereza: 0.9 } },
  /* As três almofadas soltas em azul-noite do Dracula, o mesmo acento da
     cadeira. Elas não têm material próprio — o sofá inteiro é uma malha só —,
     mas são ilhas de geometria separadas, e a caixa abaixo pega as três e só
     elas: as almofadas do encosto passam de 0,80 na profundidade e as do
     assento começam abaixo de 0,45 na altura.
     Nos eixos crus do arquivo, que é Z-para-cima, Y é a profundidade e Z é a
     altura. E o azul não chega a #4a5a96 como na cadeira: a textura tem só
     0,18 de azul em linear, e nem o branco puro multiplicado por ela alcança
     os 0,30 daquele tom. Este é o mais perto que dá, e ao lado do preto lê
     como azul do mesmo jeito. */
  recolorirIlhas: [
    { dentro: { y: [0.2, 0.8], z: [0.45, 1] }, cor: "#b0c4ff", metal: 0.05, aspereza: 0.75 },
  ],
  prefixo: "sofa_modelo",
};

/**
 * A mesa de centro, vazia.
 *
 * Sai tudo que estava em cima — a tigela, os salgados, a lata — e os dois
 * controles, que ficavam um na mesa e outro no chão.
 */
export const MESA_CENTRO: Encaixe = {
  arquivo: "/modelos/coofe_table.glb",
  pai: "coffee_table",
  substitui: [
    "coffee_table_top",
    "coffee_table_leg_1", "coffee_table_leg_2", "coffee_table_leg_3", "coffee_table_leg_4",
    "snack_bowl", "snack_bowl_inner", "snacks", "soda_can",
  ],
  /* Como no sofá, o Z é o eixo que aperta (1,55 / 0,90 do arquivo), então é
     ele que manda: a mesa sai com 1,55 de comprimento, 0,69 de profundidade e
     0,46 de altura. */
  alvo: { x: 0.75, y: 0.5, z: 1.55 },
  proporcional: true,
  /* Adiantada, para o sofá maior não comer o vão entre os dois: assim ficam
     0,49 de tapete entre a frente do sofá e as costas da mesa, e ainda sobram
     0,37 até o móvel da TV. */
  base: [0.15, 0, 0],
  giroY: Math.PI / 2,
  recolorir: { Material: TOM_DA_MADEIRA },
  prefixo: "mesa_centro_modelo",
};

/**
 * Altura do tampo, que é sobre ela que o xadrez e o DS se apoiam.
 *
 * Sai do tamanho do encaixe (0,268 do arquivo x 1,722), e não de um número
 * escrito à mão: foi assim que o globo e o livro ficaram boiando quando a
 * estante mudou de tamanho.
 */
const ALTURA_DA_MESA_DE_CENTRO = 0.462;

/**
 * O meio da mesa de centro, na largura dela.
 *
 * O `base` do encaixe é medido no grupo `coffee_table`, e a mesa não está
 * centrada nesse grupo: ela entra deslocada 0,15 para acertar o vão até o
 * sofá. Quem escreve 0 aqui não põe a coisa no meio da mesa — põe 15 cm para
 * o lado do sofá, encostada na borda, que era onde o xadrez e o DS estavam.
 */
const MEIO_DA_MESA_DE_CENTRO = 0.15;

/**
 * O tabuleiro de xadrez, no meio da mesa de centro.
 *
 * O alvo não é o tamanho do tabuleiro: o `giroY` de 0,3 entra ANTES da
 * medida, e a caixa de um quadrado girado 17° é 25% maior que o lado dele.
 * Com 0,5 de alvo o tabuleiro sai com 0,40 de lado — um tabuleiro de
 * verdade —, e sobram 0,09 de mesa de cada lado. Era esse desconto que
 * deixava o de antes com 0,24, menor que o DS ao lado.
 */
export const XADREZ: Encaixe = {
  arquivo: "/modelos/wooden_chess_set.glb",
  pai: "coffee_table",
  substitui: [],
  alvo: { x: 0.5, y: 0.2, z: 0.5 },
  proporcional: true,
  base: [MEIO_DA_MESA_DE_CENTRO, ALTURA_DA_MESA_DE_CENTRO, 0],
  giroY: 0.3,
  prefixo: "xadrez_modelo",
};

/**
 * O Nintendo DS, na ponta da mesa de centro, na mesma linha do xadrez.
 *
 * Mesmo desconto de caixa girada do xadrez: com 0,19 de alvo o DS sai com
 * 0,155 de comprimento aberto, que é o tamanho de um DS.
 */
export const NINTENDO: Encaixe = {
  arquivo: "/modelos/nintendo_ds.glb",
  pai: "coffee_table",
  substitui: [],
  alvo: { x: 0.19, y: 0.12, z: 0.19 },
  proporcional: true,
  base: [MEIO_DA_MESA_DE_CENTRO, ALTURA_DA_MESA_DE_CENTRO, 0.5],
  giroY: -0.5,
  prefixo: "ds_modelo",
};

/**
 * O móvel da TV, em madeira escura.
 *
 * O modelo vem com um material só e nenhuma textura, então a madeira entra
 * pela cor. É a mesma troca por material da cadeira.
 */
export const MOVEL_TV: Encaixe = {
  arquivo: "/modelos/tv_stand.glb",
  pai: "tv_wall",
  substitui: ["tv_stand", "tv_stand_top", "tv_stand_shelf"],
  /* Um passo maior em tudo — 1,95 x 0,50 x 0,53, contra 1,62 x 0,42 x 0,44 —,
     porque ao lado da TV o móvel lia como um banquinho.
     Quem manda no tamanho é o Z, e é ele que tem limite: o bebedouro está a
     1,25 daqui, e com 1,95 de comprimento a ponta do móvel para a 0,10 dele.
     Crescer mais exigiria mexer no bebedouro também. O X e o Y ficam folgados
     de propósito: apertados, um deles mandaria e o comprimento não cresceria.
     E o modelo não dá para engordar sem esticar: ele é 3,7 vezes mais comprido
     do que alto, então altura e comprimento andam sempre juntos. */
  alvo: { x: 0.62, y: 0.62, z: 1.95 },
  proporcional: true,
  base: [0, 0, 0],
  giroY: 0,
  /* As portas e o nicho aberto do móvel ficam em +X no arquivo, que aqui é o
     lado de fora da ilha: quem sentava no sofá via as costas dele. O giro é o
     FINAL, e não o `giroY`, por regra — o `giroY` entra antes da medida — mas
     meia volta é o caso em que os dois dariam no mesmo, porque a caixa
     envolvente não muda. */
  giroFinalY: Math.PI,
  ...madeira(),
  prefixo: "movel_tv_modelo",
};

/**
 * Altura do tampo do móvel, onde a TV e o PS1 se apoiam.
 *
 * Sai do tamanho do encaixe (2,950 do arquivo x 0,18062), como a das estantes
 * e a da mesa de centro: o número escrito à mão é justamente o que deixa as
 * coisas boiando quando o móvel debaixo muda de tamanho.
 */
const ALTURA_DO_MOVEL_TV = 0.533;

/**
 * A TV.
 *
 * É uma malha só, com a tela dentro da textura — não dá para pintar nela. Por
 * isso a caixa `tv_screen` desenhada CONTINUA na cena, encostada na frente do
 * modelo: é ela que os Mods pintam e que a câmera enquadra. Sem isso a seção
 * perderia o conteúdo e a câmera perderia o alvo.
 */
export const TV: Encaixe = {
  arquivo: "/modelos/tv.glb",
  pai: "tv_wall",
  substitui: [
    "tv_neck", "tv_frame",
    "speaker_1", "speaker_2", "speaker_cone_1", "speaker_cone_2",
  ],
  alvo: { x: 0.2, y: 0.86, z: 1.42 },
  proporcional: true,
  base: [0, ALTURA_DO_MOVEL_TV, 0],
  giroY: Math.PI,
  /* O material do arquivo é branco com metalness 1,0 e roughness 1,0, e sem
     textura ligada à cor base — as imagens que o .glb carrega não são o mapa
     de cor. Isso renderiza um cinza chapado, que foi o que apareceu. */
  recolorir: { lambert1: { cor: "#0e0e11", metal: 0.25, aspereza: 0.45 } },
  prefixo: "tv_modelo",
};

/** O PlayStation, em cima do móvel da TV, no lugar do console desenhado. */
export const PS1: Encaixe = {
  arquivo: "/modelos/ps1.glb",
  pai: "tv_wall",
  substitui: [
    "console", "console_led",
    "game_case_1", "game_case_2", "game_case_3",
  ],
  alvo: { x: 0.26, y: 0.09, z: 0.34 },
  proporcional: true,
  base: [-0.02, ALTURA_DO_MOVEL_TV, -0.45],
  giroY: 0,
  /* De frente para a mesa de centro, como o móvel debaixo dele.
     Aqui o quarto de volta não é o mesmo caso do móvel: no arquivo o console
     tem a frente em +Z, e não em -X. As duas faces em X são as LATERAIS, as
     duas ranhuradas, e é por isso que meia volta não resolvia nada: trocava
     um flanco pelo outro.
     A frente é a que traz os dois "SAVE CARD" numerados e as entradas de
     controle. A outra face comprida também tem bocas — as escritas "PORT 1"
     e "PORT 2" —, e é a TRASEIRA: quem for pelo texto vira o console ao
     contrário, que foi o que aconteceu aqui.
     Continua sendo giro FINAL. No `giroY` ele entraria antes da medida, e o
     alvo do X (0,26 — a largura de um PS1 de verdade) cairia sobre os 18,5 cm
     da profundidade: o console sairia um terço maior do que é. */
  giroFinalY: -Math.PI / 2,
  prefixo: "ps1_modelo",
};

/** O fliperama. */
export const FLIPERAMA: Encaixe = {
  arquivo: "/modelos/arcade_cabinet.glb",
  pai: "arcade_cabinet",
  /* `arcade_screen` NÃO entra aqui: a chapa dela é a superfície onde os
     jogos são escritos, e some junto com o resto se for substituída. Ela
     continua, recolocada logo abaixo. */
  substitui: [
    "arcade_body", "arcade_marquee", "arcade_panel",
    "arcade_stick", "arcade_ball", "arcade_button_1", "arcade_button_2",
    "arcade_base_glow",
  ],
  /* A tela do arquivo é um retângulo de 0,52 x 0,61 deitado 23° para trás,
     entre 0,885 e 1,445 de altura, e recuado uns 4 cm do friso que o cerca —
     medido a raio, num varrimento de frente para o gabinete.
     A chapa desenhada nasce com 0,05 x 0,42 x 0,50 e de pé no eixo X, porque
     o gabinete desenhado olhava para -X; o do arquivo olha para +Z do grupo.
     Daí a escala grande no X (0,05 vira 0,50 de largura), a fina no Z (a
     espessura) e o giro em torno do X, que é o que deita a chapa junto com a
     tela. Ela para 4 mm à frente do vidro: encostada, as duas superfícies
     brigam pelo mesmo pixel e a tela pisca. */
  recoloca: {
    arcade_screen: {
      posicao: [0, 1.169, -0.01],
      giro: [-0.404, 0, 0],
      escala: [10, 1.405, 0.024],
    },
  },
  /* 1,75 de altura, que é a de um fliperama de verdade — dá 0,67 de largura
     e 0,92 de profundidade, contando o painel de controle que avança.
     O que mandava antes era o Z, e por acidente: o arquivo é 1,4 vez mais
     fundo do que largo, então 0,66 de alvo no Z virava um armário de 1,26 de
     altura, mais baixo que a luminária ao lado. Agora o Y é que aperta, e é
     ele quem deve apertar: a altura é a medida que se compara com uma pessoa.
     O X e o Z ficam folgados de propósito. */
  alvo: { x: 0.72, y: 1.75, z: 1.0 },
  proporcional: true,
  base: [0, 0, 0],
  giroY: Math.PI / 2,
  /* Meia volta: a tela e o joystick olhavam para fora da ilha. O grupo da
     cena já vem girado -0,9, e com o giro daqui a frente passa a apontar para
     o meio do deck com 5° de diferença. */
  giroFinalY: Math.PI,
  semSombra: true,
  prefixo: "fliperama_modelo",
};

/* ---------- resto da ilha ---------- */

/**
 * A estante atrás do sofá.
 *
 * Sai tudo que estava nela: os quatro cubos de "projeto entregue" no topo e os
 * doze livros desenhados. O modelo já vem com as próprias fileiras de livros.
 */
/*
 * Três estantes iguais, lado a lado, no lugar da divisória.
 *
 * Uma só, esticada para cobrir o vão, saía desproporcional — alta e larga
 * demais para o resto da ilha. Várias do mesmo tamanho preenchem a mesma
 * extensão com a proporção de uma estante de verdade.
 */

/*
 * O tamanho em que a estante realmente entra na cena.
 *
 * Não é o que está escrito no `alvo`: aquilo é uma caixa em que o modelo cabe
 * DENTRO sem distorcer, e dos três eixos quem manda é o mais apertado — aqui o
 * X, com 0,5 sobre os 0,879 de profundidade do arquivo. Os outros dois sobram.
 *
 * Os três números vivem aqui porque três coisas dependem deles: a altura é
 * onde o globo se apoia, e a profundidade e o comprimento são o que a estante
 * de nichos copia para as três ficarem iguais. Enquanto a altura era um número
 * solto escrito à mão, o globo ficou boiando toda vez que a estante mudou de
 * tamanho.
 */
const ESTANTE = { profundidade: 0.5, altura: 1.352, comprimento: 1.021 };

/*
 * O topo das tábuas do piso.
 *
 * O chão da ilha não é o plano y = 0: as tábuas têm 3,5 cm de espessura e o
 * topo delas fica em 0,0365. Um móvel apoiado em y = 0 tem essa altura
 * enterrada — e é o caso de quase todos, porque nos que têm base cheia isso
 * não dá para ver. Na estante de nichos dá: ela é vazada até embaixo, e a
 * fileira de baixo entrava no chão pela metade.
 *
 * As três sobem juntas, senão a corrigida ficaria 3,5 cm mais alta que as
 * vizinhas — que é pior do que as três enterradas por igual.
 *
 * A altura em si vem de `cena.ts`, de quem constrói a tábua. Repetida aqui,
 * ela já saiu do lugar uma vez sem ninguém notar.
 */

/*
 * Quanto uma estante fica da vizinha, de centro a centro. A sobra de 0,08
 * sobre o comprimento é a fresta entre elas.
 */
const PASSO_DA_ESTANTE = 1.1;

/*
 * O quanto as duas recuam na direção da cadeira, no eixo local da divisória.
 *
 * A divisória desenhada nasceu no meio da ilha (x = 0,05 no mundo) e as
 * estantes herdaram esse lugar, longe da mesa. Com o recuo a frente delas fica
 * em x = -0,65, contra as costas da cadeira em -1,08: perto o bastante para
 * quem está sentado alcançar, sem encostar. O globo anda junto, senão fica
 * boiando onde a estante estava.
 */
const ESTANTES_PERTO_DA_CADEIRA = -0.45;

function estante(z: number, prefixo: string, substitui: string[]): Encaixe {
  return {
    arquivo: "/modelos/bookshelf.glb",
    pai: "divider_shelf",
    substitui,
    alvo: { x: 0.5, y: 1.5, z: 1.2 },
    proporcional: true,
    base: [ESTANTES_PERTO_DA_CADEIRA, TOPO_DAS_TABUAS, z],
    /* O modelo abre para +Z; a meia volta negativa vira as duas para a zona
       de trabalho. Viradas para o outro lado, quem olhava a mesa via só o
       fundo fechado — um paredão de madeira no meio da ilha. */
    giroY: -Math.PI / 2,
    ...madeira(["Shelf__0"]),
    prefixo,
  };
}

export const ESTANTE_1 = estante(-PASSO_DA_ESTANTE, "estante_1_modelo", [
  "divider_side_left", "divider_side_right", "divider_back",
  "divider_mid_post", "divider_board_1", "divider_board_2", "divider_board_3",
  "divider_top",
  ...[1, 2, 3, 4].flatMap((i) => [`shipped_project_${i}`, `shipped_project_label_${i}`]),
  ...Array.from({ length: 12 }, (_, i) => `book_${i + 1}`),
]);

export const ESTANTE_3 = estante(PASSO_DA_ESTANTE, "estante_3_modelo", []);

/**
 * A estante do meio, que é de nichos.
 *
 * O arquivo se chama `stand_book` e por isso entrou como enfeite, um livro em
 * pé de 20 cm em cima da estante. Ele não é um livro: são 1,82 x 1,82 x 0,39,
 * uma estante de nichos inteira. Aqui ela vira a terceira do conjunto.
 *
 * É a única do arquivo que NÃO é proporcional. As outras duas cabem dentro do
 * `alvo` sem distorcer, e o que sai disso é a caixa medida em `ESTANTE`; esta
 * recebe essa caixa como medida exata, para ficar do mesmo tamanho e da mesma
 * grossura das vizinhas. O preço é que os nichos, quadrados no arquivo, ficam
 * um terço mais altos do que largos — que é o que "do mesmo tamanho" custa num
 * modelo que nasceu quadrado.
 */
export const ESTANTE_2: Encaixe = {
  arquivo: "/modelos/stand_book.glb",
  pai: "divider_shelf",
  substitui: [],
  alvo: { x: ESTANTE.profundidade, y: ESTANTE.altura, z: ESTANTE.comprimento },
  proporcional: false,
  base: [ESTANTES_PERTO_DA_CADEIRA, TOPO_DAS_TABUAS, 0],
  /* O mesmo quarto de volta das outras: no arquivo a largura corre no X e a
     profundidade no Z, e na divisória é o contrário. */
  giroY: -Math.PI / 2,
  ...madeira(),
  /* A UV do arquivo quebrava o veio em triângulos dentro de cada nicho. */
  uvCaixa: 1.2,
  prefixo: "estante_2_modelo",
};

/** O globo, em cima da estante da esquerda. */
export const GLOBO: Encaixe = {
  arquivo: "/modelos/globe.glb",
  pai: "divider_shelf",
  substitui: [],
  alvo: { x: 0.26, y: 0.34, z: 0.26 },
  proporcional: true,
  base: [ESTANTES_PERTO_DA_CADEIRA, TOPO_DAS_TABUAS + ESTANTE.altura, -PASSO_DA_ESTANTE],
  giroY: 0.4,
  prefixo: "globo_modelo",
};

/** O gabinete, no lugar da torre desenhada. */
export const GABINETE: Encaixe = {
  arquivo: "/modelos/pc.glb",
  pai: "pc_tower",
  substitui: ["tower_case", "tower_glass", "tower_led"],
  alvo: { x: 0.32, y: 0.66, z: 0.6 },
  proporcional: true,
  base: [0, 0, 0],
  giroY: 0,
  /* Alinhado com a mesa: a frente do gabinete — os materiais do arquivo se
     chamam "Frente" e "Tras", e a frente é +Z — olhava para a ponta da mesa,
     atravessada. Um quarto de volta põe a frente em +X, que é o lado de onde
     a cadeira olha, e o lado comprido do gabinete passa a correr junto com o
     lado comprido da mesa.
     Aqui o giro TEM de ser o final. No `giroY` ele entraria antes da medida,
     e aí o alvo apertado do X (0,32) cairia sobre o lado fundo do gabinete:
     o PC sairia com 43% do tamanho. */
  giroFinalY: Math.PI / 2,
  prefixo: "gabinete_modelo",
};

/** O bebedouro. */
export const BEBEDOURO: Encaixe = {
  arquivo: "/modelos/water_cooler.glb",
  pai: "water_cooler",
  substitui: [
    "cooler_body", "cooler_bottle", "cooler_bottle_neck",
    "cooler_tap", "cooler_tray",
  ],
  alvo: { x: 0.42, y: 1.45, z: 0.42 },
  proporcional: true,
  base: [0, 0, 0],
  giroY: 0,
  /* As torneiras avançam em -Z no arquivo, e o bebedouro está em (3,3; -1,0)
     na ilha: sem giro, elas apontavam para a borda. O ângulo é o que vira a
     frente para o meio do deck — `atan2` de (3,3; -1,0) visto de -Z. Não é um
     número redondo porque a posição do móvel também não é. */
  giroFinalY: 1.87,
  prefixo: "bebedouro_modelo",
};

/**
 * A lixeira. Solta no deck, não num grupo: por isso o pai é a ilha.
 *
 * 0,38 de boca, contra os 0,3 de antes. O arquivo é quase tão alto quanto
 * largo, então quem manda é o X e o Z — o alvo do Y fica de folga.
 */
export const LIXEIRA: Encaixe = {
  arquivo: "/modelos/office_trash_can.glb",
  pai: "island",
  substitui: ["trash_bin", "trash_paper"],
  alvo: { x: 0.38, y: 0.5, z: 0.38 },
  proporcional: true,
  /* Apoiada na madeira, como a luminária: o pé dela é um disco estreito, e
     3,6 cm enterrados num balde de 39 cm aparecem. */
  base: [-0.85, TOPO_DAS_TABUAS, -2.35],
  giroY: 0.3,
  prefixo: "lixeira_modelo",
};

/** A luminária de chão. */
export const LUMINARIA: Encaixe = {
  arquivo: "/modelos/lamp.glb",
  pai: "floor_lamp",
  substitui: ["floor_lamp_base", "floor_lamp_pole", "floor_lamp_shade"],
  alvo: { x: 0.45, y: 1.65, z: 0.45 },
  proporcional: true,
  /* Apoiada na madeira, e não no deck de ardósia que fica 3,65 cm abaixo
     dela. Numa peça de base larga a diferença não aparece; o pé da lamparina
     é um disco fino, e ali ela some inteira dentro do piso. */
  base: [0, TOPO_DAS_TABUAS, 0],
  giroY: 0,
  /* Sem `recolorir`: o arquivo TEM mapa de cor — cúpula de tecido e ferro
     escuro —, ele só não chegava porque a extensão que o descreve saiu do
     glTF. Quem o traz de volta é `resgatarEspecularAntigo`. Pintar por cima
     de novo apagaria o desenho debaixo de um bege chapado. */
  prefixo: "luminaria_modelo",
};

/**
 * As plantas.
 *
 * Três modelos diferentes para os quatro vasos, e não o mesmo quatro vezes:
 * a árvore tem 50 mil triângulos e o vaso de folhas 34 mil, então os dois
 * lugares menos visíveis levam o vaso simples, de 381. Os grupos da cena já
 * têm escala própria, e o encaixe entra por dentro dela.
 */
function planta(arquivo: string, pai: string, alto: number, prefixo: string): Encaixe {
  return {
    arquivo: `/modelos/${arquivo}.glb`,
    pai,
    substitui: [
      `${pai}_pot`, `${pai}_pot_rim`, `${pai}_stem`,
      ...Array.from({ length: 4 }, (_, i) => `${pai}_leaf_${i + 1}`),
    ],
    alvo: { x: alto * 0.75, y: alto, z: alto * 0.75 },
    proporcional: true,
    base: [0, 0, 0],
    giroY: 0.5,
    semSombra: true,
    prefixo,
  };
}

export const PLANTA_1 = planta("green_tree", "office_plant_1", 1.5, "planta_1_modelo");
export const PLANTA_2 = planta("potted_plant", "office_plant_2", 1.2, "planta_2_modelo");
export const PLANTA_3 = planta("low_poly_pot", "office_plant_3", 1.1, "planta_3_modelo");

/** A planta da mesa de trabalho tem outros nomes de peça. */
export const PLANTA_MESA: Encaixe = {
  arquivo: "/modelos/low_poly_pot.glb",
  pai: "plant",
  substitui: [
    "pot", "pot_rim", "plant_stem",
    "foliage_1", "foliage_2", "foliage_3", "foliage_4",
  ],
  alvo: { x: 0.6, y: 0.95, z: 0.6 },
  proporcional: true,
  base: [0, 0, 0],
  giroY: -0.3,
  semSombra: true,
  prefixo: "planta_mesa_modelo",
};

/* ---------- os três quadros ---------- */

/**
 * O mesmo whiteboard nos três lugares: a lousa da stack, o quadro de projetos
 * e o cavalete do currículo.
 *
 * A chapa DESENHADA de cada um continua na cena, encostada na face do modelo
 * (ver `encostarNoQuadro`, em `texturas.ts`). É ela que a câmera enquadra e
 * que a pintura escreve.
 *
 * Pintar direto na malha `Backboard` do modelo seria mais limpo e não
 * funciona: a UV dele é a de um modelo que nunca foi texturizado, e a textura
 * inteira colapsa num punhado de texels — o quadro sai de uma cor chapada só.
 * Refazer a UV como um plano tampouco resolveu: os três quadros entram em
 * orientações diferentes e a escolha do eixo "de cima" não converge.
 *
 * O quadro é paisagem (2,876 x 1,828, proporção 1,573). A folha do currículo
 * era retrato; virou paisagem junto, em `texturas.ts`.
 */
function quadro(
  pai: string,
  substitui: string[],
  prefixo: string,
  altura: number,
  /* A face do modelo é fina no X. A lousa da stack também era, mas o quadro
     de projetos e a folha do currículo eram finos no Z — e os post-its são
     cartões voltados para o Z. Sem o quarto de volta eles ficariam de perfil,
     de lado no quadro. */
  deitado: boolean,
): Encaixe {
  return {
    arquivo: "/modelos/whiteboard.glb",
    pai,
    substitui,
    alvo: deitado
      ? { x: 2.3, y: altura, z: 0.55 }
      : { x: 0.55, y: altura, z: 2.3 },
    proporcional: true,
    base: [0, 0, 0],
    giroY: deitado ? Math.PI / 2 : 0,
    prefixo,
  };
}

export const QUADRO_STACK = quadro(
  "whiteboard",
  [
    "whiteboard_frame", "whiteboard_tray",
    "whiteboard_leg_1", "whiteboard_leg_2",
    "whiteboard_foot_1", "whiteboard_foot_2",
  ],
  "quadro_stack_modelo",
  2.0,
  false,
);

export const QUADRO_PROJETOS = quadro(
  "project_board",
  [
    "project_board_frame", "project_board_header",
    "project_board_leg_1", "project_board_leg_2",
    "project_board_foot_1", "project_board_foot_2",
  ],
  "quadro_projetos_modelo",
  2.1,
  true,
);

export const QUADRO_CURRICULO = quadro(
  "resume_easel",
  [
    "easel_leg_left", "easel_leg_right", "easel_leg_back", "easel_tray",
    "resume_backing", "resume_stack", "resume_stack_top",
  ],
  "quadro_curriculo_modelo",
  2.0,
  true,
);

/** Tudo que a ilha carrega, na ordem em que entra. */
export const ENCAIXES: Encaixe[] = [
  MESA_GAMER, MACBOOK, MONITOR_ESQ, MONITOR_DIR, CADEIRA,
  SOFA, MESA_CENTRO, XADREZ, NINTENDO,
  MOVEL_TV, TV, PS1, FLIPERAMA,
  ESTANTE_1, ESTANTE_2, ESTANTE_3, GLOBO, GABINETE, BEBEDOURO, LIXEIRA, LUMINARIA,
  PLANTA_1, PLANTA_2, PLANTA_3, PLANTA_MESA,
  QUADRO_STACK, QUADRO_PROJETOS, QUADRO_CURRICULO,
];

/**
 * Um arquivo baixado uma vez só, mesmo usado em dois lugares.
 *
 * Os dois monitores são o mesmo .glb de 7,9 MB. Sem este cache seriam dois
 * downloads. As cópias compartilham geometria e material com o original, que
 * fica vivo aqui entre montagens da ilha — é cache, e por isso o descarte de
 * uma instância não libera a geometria: liberaria a da outra também.
 */
const baixados = new Map<string, Promise<THREE.Group>>();

function baixar(arquivo: string): Promise<THREE.Group> {
  const guardado = baixados.get(arquivo);
  if (guardado) return guardado;
  const promessa = new GLTFLoader()
    .loadAsync(arquivo)
    .then(async (gltf) => {
      await resgatarEspecularAntigo(gltf);
      return gltf.scene;
    });
  baixados.set(arquivo, promessa);
  return promessa;
}

/** O que interessa do acabamento antigo, do jeito que ele está no JSON. */
type EspecularAntigo = {
  diffuseTexture?: { index: number };
  diffuseFactor?: [number, number, number, number];
};

/**
 * Devolve a textura de cor aos materiais que vieram no acabamento antigo.
 *
 * `KHR_materials_pbrSpecularGlossiness` saiu do glTF e o GLTFLoader da three
 * deixou de lê-lo. Num arquivo que descreve o material SÓ por essa extensão —
 * é o caso da lamparina — o carregador cai no `pbrMetallicRoughness` do
 * núcleo, que ali não existe: sai um material branco liso, com o mapa de
 * normais e mais nada. As imagens continuam dentro do .glb; o que falta é
 * alguém apontando para elas.
 *
 * A textura é pedida ao próprio carregador, pelo índice que a extensão dá, e
 * entra como `map`. Ela pertence ao arquivo do cache, como o material
 * emprestado, e por isso NÃO entra no lixo de nenhum encaixe: descartá-la
 * deixaria a lamparina branca de novo na segunda montagem da ilha.
 */
async function resgatarEspecularAntigo(gltf: GLTF): Promise<void> {
  const definicoes: { name?: string; extensions?: { KHR_materials_pbrSpecularGlossiness?: EspecularAntigo } }[] =
    gltf.parser.json.materials ?? [];
  if (!definicoes.some((d) => d.extensions?.KHR_materials_pbrSpecularGlossiness)) return;

  /* Os materiais que a three montou, pelo nome que veio do arquivo. */
  const porNome = new Map<string, THREE.MeshStandardMaterial[]>();
  gltf.scene.traverse((no) => {
    const malha = no as THREE.Mesh;
    if (!malha.isMesh) return;
    for (const m of Array.isArray(malha.material) ? malha.material : [malha.material]) {
      const lista = porNome.get(m.name);
      if (lista) lista.push(m as THREE.MeshStandardMaterial);
      else porNome.set(m.name, [m as THREE.MeshStandardMaterial]);
    }
  });

  await Promise.all(definicoes.map(async (definicao) => {
    const antigo = definicao.extensions?.KHR_materials_pbrSpecularGlossiness;
    const alvos = porNome.get(definicao.name ?? "");
    if (!antigo?.diffuseTexture || !alvos) return;

    const textura = (await gltf.parser.getDependency(
      "texture",
      antigo.diffuseTexture.index,
    )) as THREE.Texture;
    /* Quem marca o espaço de cor é o `assignTexture` do carregador, e é
       justamente ele que não roda para uma extensão que a three não conhece.
       Sem esta linha o difuso entra como dado linear e a lamparina sai
       lavada. */
    textura.colorSpace = THREE.SRGBColorSpace;

    for (const material of alvos) {
      if (material.map) continue;
      material.map = textura;
      const fator = antigo.diffuseFactor;
      /* Os fatores do glTF são lineares; a cor multiplica a textura. */
      if (fator) material.color.setRGB(fator[0], fator[1], fator[2], THREE.LinearSRGBColorSpace);
      /* O especular-brilho não tem tradução direta para metal/aspereza. Em
         vez de inventar uma, o material fica fosco: é o tecido da cúpula, que
         é a maior parte do que se vê da lamparina. */
      material.metalness = 0;
      material.roughness = 0.7;
      material.needsUpdate = true;
    }
  }));
}

/** O primeiro material com este nome dentro de um modelo já baixado. */
function acharMaterial(raiz: THREE.Object3D, nome: string) {
  let achado: THREE.Material | undefined;
  raiz.traverse((no) => {
    if (achado) return;
    const malha = no as THREE.Mesh;
    if (!malha.isMesh) return;
    const materiais = Array.isArray(malha.material) ? malha.material : [malha.material];
    achado = materiais.find((m) => m.name === nome);
  });
  return achado;
}

/**
 * Carrega e encaixa um modelo. Devolve o que precisa ser descartado quando a
 * ilha sair: geometria, material e textura vivem na placa de vídeo, e o
 * coletor do JavaScript não alcança nenhum dos três.
 */
export async function encaixarModelo(
  ilha: THREE.Object3D,
  encaixe: Encaixe,
): Promise<Descartaveis> {
  const lixo: Descartaveis = [];

  const pai = ilha.getObjectByName(encaixe.pai);
  if (!pai) return lixo;

  const modelo = (await baixar(encaixe.arquivo)).clone(true);

  /* O material emprestado NÃO entra no lixo: ele é do arquivo dono, vive no
     cache junto com ele, e descartá-lo aqui apagaria a madeira das estantes
     de livros na primeira vez que a ilha fosse desmontada. */
  const emprestado = encaixe.materialDe
    ? acharMaterial(await baixar(encaixe.materialDe.arquivo), encaixe.materialDe.material)
    : undefined;

  /* Dois níveis de propósito: o de dentro gira, o de fora escala. Girar e
     escalar no mesmo objeto aplicaria a escala nos eixos do modelo, e um
     alvo não-cúbico sairia distorcido no eixo errado. */
  const giro = new THREE.Group();
  giro.name = `${encaixe.prefixo}_giro`;
  giro.rotation.y = encaixe.giroY ?? 0;
  giro.add(modelo);

  const suporte = new THREE.Group();
  suporte.name = encaixe.prefixo;
  suporte.add(giro);

  /* Medida com o giro já aplicado e a escala ainda em 1. */
  giro.updateWorldMatrix(true, true);
  const caixa = new THREE.Box3().setFromObject(giro);
  const tamanho = caixa.getSize(new THREE.Vector3());
  const centro = caixa.getCenter(new THREE.Vector3());

  const porEixo = new THREE.Vector3(
    encaixe.alvo.x / (tamanho.x || 1),
    encaixe.alvo.y / (tamanho.y || 1),
    encaixe.alvo.z / (tamanho.z || 1),
  );
  const escala = encaixe.escala !== undefined
    ? new THREE.Vector3().setScalar(encaixe.escala)
    : encaixe.proporcional
      ? new THREE.Vector3().setScalar(Math.min(porEixo.x, porEixo.y, porEixo.z))
      : porEixo;

  /* Leva o centro da base do modelo para a origem do suporte, para o `base`
     do encaixe significar "onde o móvel encosta no chão" e não "onde fica o
     meio do volume". */
  giro.position.set(-centro.x, -caixa.min.y, -centro.z);
  suporte.scale.copy(escala);
  suporte.position.set(...encaixe.base);
  suporte.rotation.y = encaixe.giroFinalY ?? 0;

  /* A peça desenhada some só agora, com o modelo pronto: escondê-la antes
     deixaria um buraco na cena durante o download. E o rename vem antes de
     batizar as malhas do modelo, senão os dois nomes coexistem por um
     instante e `getObjectByName` pode devolver o errado. */
  for (const nome of encaixe.substitui) {
    const peca = ilha.getObjectByName(nome);
    if (!peca) continue;
    peca.visible = false;
    lixo.push({ dispose: () => { peca.visible = true; } });
  }

  for (const [nome, onde] of Object.entries(encaixe.recoloca ?? {})) {
    const peca = ilha.getObjectByName(nome);
    if (!peca) continue;
    const antes = {
      posicao: peca.position.clone(),
      giro: peca.rotation.clone(),
      escala: peca.scale.clone(),
    };
    peca.position.set(...onde.posicao);
    peca.rotation.set(...onde.giro);
    peca.scale.set(...onde.escala);
    lixo.push({ dispose: () => {
      peca.position.copy(antes.posicao);
      peca.rotation.copy(antes.giro);
      peca.scale.copy(antes.escala);
    } });
  }

  for (const alvo of Object.values(encaixe.renomeia ?? {})) {
    const antiga = ilha.getObjectByName(alvo);
    if (!antiga) continue;
    antiga.name = `${alvo}_desenhado`;
    lixo.push({ dispose: () => { antiga.name = alvo; } });
  }

  /* O GLTFLoader reescreve o nome de cada nó (é o `sanitizeNodeName` da three,
     que existe para o nome poder virar caminho de animação): espaço vira
     underscore E os caracteres reservados `[ ] . : /` somem.
     Então "Ultrawide Monitor_Screen_0" chega como "Ultrawide_Monitor_Screen_0"
     e "Backboard_Material.002_0" chega como "Backboard_Material002_0".
     Normalizar os dois lados evita ter de escrever no encaixe um nome que não
     é o que se lê no arquivo — e foi o ponto, não o espaço, que deixou os três
     quadros em branco na primeira tentativa. */
  const chave = (nome: string) => nome.replace(/\s/g, "_").replace(/[[\].:/]/g, "");
  const renomeia = new Map(
    Object.entries(encaixe.renomeia ?? {}).map(([de, para]) => [chave(de), para]),
  );

  /* A UV só pode ser refeita depois que o modelo estiver posicionado: o eixo
     "de cima" da textura é decidido pela orientação no mundo, e antes de o
     suporte entrar na cena essa orientação ainda não existe. */
  const aplanar: THREE.Mesh[] = [];
  const projetar: THREE.Mesh[] = [];

  /* Uma cópia por material do arquivo, não por malha: a cadeira tem 22
     malhas e seis materiais, e clonar por malha faria 22 programas de shader
     onde bastam seis. */
  const tingidos = new Map<THREE.Material, THREE.Material>();
  const tingir = (material: THREE.Material) => {
    const guardado = tingidos.get(material);
    if (guardado) return guardado;
    const receita = encaixe.recolorir?.[material.name];
    if (receita === undefined) return material;
    const { cor, metal, aspereza } =
      typeof receita === "string" ? { cor: receita, metal: undefined, aspereza: undefined } : receita;
    const copia = (material as THREE.MeshStandardMaterial).clone();
    copia.color.set(cor);
    /* Metalness alta transforma a cor em brilho: o acento da cadeira vinha com
       0,77 e, trocado por azul, saía lavanda lavado em vez de azul. Poder
       baixar isso junto com a cor é o que faz a troca render a cor pedida. */
    if (metal !== undefined) copia.metalness = metal;
    if (aspereza !== undefined) copia.roughness = aspereza;
    copia.needsUpdate = true;
    tingidos.set(material, copia);
    lixo.push(copia);
    return copia;
  };

  modelo.traverse((no) => {
    if (!(no as THREE.Mesh).isMesh) return;
    const malha = no as THREE.Mesh;
    malha.castShadow = !encaixe.semSombra;
    malha.receiveShadow = true;
    const herdado = renomeia.get(chave(malha.name));
    malha.name = herdado ?? `${encaixe.prefixo}_${malha.name || "peca"}`;

    if (herdado && encaixe.uvPlano) aplanar.push(malha);
    if (encaixe.uvCaixa !== undefined) projetar.push(malha);

    if (emprestado) {
      const troca = encaixe.materialDe?.troca;
      const cede = (m: THREE.Material) =>
        !troca || troca.includes(m.name) ? emprestado : m;
      malha.material = Array.isArray(malha.material)
        ? malha.material.map(cede)
        : cede(malha.material);
    }

    if (encaixe.recolorir) {
      malha.material = Array.isArray(malha.material)
        ? malha.material.map(tingir)
        : tingir(malha.material);
    }

    /* Depois do `recolorir`: as ilhas partem do material que a malha ficou
       tendo, então o sofá preto é a base e as almofadas saem dele. */
    if (encaixe.recolorirIlhas) pintarIlhas(malha, encaixe.recolorirIlhas, lixo);
  });

  pai.add(suporte);
  lixo.push({ dispose: () => { suporte.removeFromParent(); } });

  suporte.updateWorldMatrix(true, true);

  /* Só agora: a projeção é medida no mundo, e antes de o suporte entrar na
     cena a malha ainda não tem lugar nem escala. */
  for (const malha of projetar) {
    const geo = projetarUV(malha, encaixe.uvCaixa ?? 1);
    if (geo) lixo.push(geo);
    const material = malha.material;
    if (!Array.isArray(material)) malha.material = repetirMapa(material, lixo);
  }

  for (const malha of aplanar) {
    /* Geometria própria antes de mexer na UV. As cópias do mesmo arquivo
       compartilham a geometria, e os três quadros entram em orientações
       diferentes: reescrevendo a UV compartilhada, o último a carregar
       desmanchava a dos outros dois. */
    malha.geometry = malha.geometry.clone();
    lixo.push(malha.geometry);
    planificarUV(malha);
  }

  return lixo;
}

/**
 * Pinta ilhas de geometria de uma malha, deixando o resto dela como estava.
 *
 * Duas coisas do formato mandam no jeito como isto é feito:
 *
 * - **Vértice repetido não é vértice separado.** O arquivo repete o vértice em
 *   cada canto de UV e em cada quebra de normal, então percorrer só os índices
 *   quebraria o sofá em centenas de ilhas em vez de doze. A conectividade só
 *   aparece depois de soldar os vértices que estão no mesmo ponto.
 * - **Um grupo de material da three é uma faixa contígua do índice.** Os
 *   triângulos de cada cor estão espalhados pelo índice original, então ele é
 *   reescrito na ordem das cores antes de os grupos existirem.
 */
function pintarIlhas(
  malha: THREE.Mesh,
  regras: NonNullable<Encaixe["recolorirIlhas"]>,
  lixo: Descartaveis,
) {
  const original = malha.geometry;
  const indice = original.index;
  const pos = original.attributes.position;
  if (!indice || !pos) return;

  original.computeBoundingBox();
  const caixa = original.boundingBox;
  if (!caixa) return;
  const tamanho = caixa.getSize(new THREE.Vector3());

  const pai = new Int32Array(pos.count);
  for (let v = 0; v < pos.count; v++) pai[v] = v;
  const acha = (v: number) => {
    while (pai[v] !== v) { pai[v] = pai[pai[v]!]!; v = pai[v]!; }
    return v;
  };
  const une = (a: number, b: number) => {
    const ra = acha(a), rb = acha(b);
    if (ra !== rb) pai[rb] = ra;
  };

  /* Solda por posição arredondada: a quarta casa decimal é fina o bastante
     para não juntar peças vizinhas e grossa o bastante para o mesmo ponto
     escrito duas vezes cair na mesma chave. */
  const porPonto = new Map<string, number>();
  for (let v = 0; v < pos.count; v++) {
    const k = `${Math.round(pos.getX(v) * 1e4)},${Math.round(pos.getY(v) * 1e4)},${Math.round(pos.getZ(v) * 1e4)}`;
    const antes = porPonto.get(k);
    if (antes === undefined) porPonto.set(k, v); else une(antes, v);
  }
  const idx = indice.array;
  for (let t = 0; t < idx.length; t += 3) {
    une(idx[t]!, idx[t + 1]!);
    une(idx[t + 1]!, idx[t + 2]!);
  }

  const ilhas = new Map<number, THREE.Box3>();
  const ponto = new THREE.Vector3();
  for (let t = 0; t < idx.length; t += 3) {
    const raiz = acha(idx[t]!);
    let c = ilhas.get(raiz);
    if (!c) { c = new THREE.Box3().makeEmpty(); ilhas.set(raiz, c); }
    for (let k = 0; k < 3; k++) {
      const v = idx[t + k]!;
      c.expandByPoint(ponto.set(pos.getX(v), pos.getY(v), pos.getZ(v)));
    }
  }

  const cabe = (c: THREE.Box3, dentro: (typeof regras)[number]["dentro"]) =>
    (["x", "y", "z"] as const).every((eixo) => {
      const faixa = dentro[eixo];
      if (!faixa) return true;
      if (tamanho[eixo] === 0) return true;
      const de = (c.min[eixo] - caixa.min[eixo]) / tamanho[eixo];
      const ate = (c.max[eixo] - caixa.min[eixo]) / tamanho[eixo];
      return de >= faixa[0] && ate <= faixa[1];
    });

  const regraDaIlha = new Map<number, number>();
  for (const [raiz, c] of ilhas) {
    const i = regras.findIndex((r) => cabe(c, r.dentro));
    if (i >= 0) regraDaIlha.set(raiz, i);
  }
  if (regraDaIlha.size === 0) return;

  /* Faixa 0 é o que fica com a cor de antes; a regra `i` vira a faixa `i + 1`. */
  const porFaixa: number[][] = [[], ...regras.map(() => [] as number[])];
  for (let t = 0; t < idx.length; t += 3) {
    const faixa = (regraDaIlha.get(acha(idx[t]!)) ?? -1) + 1;
    porFaixa[faixa]!.push(idx[t]!, idx[t + 1]!, idx[t + 2]!);
  }

  /* Geometria própria antes de reescrever o índice: as cópias do mesmo
     arquivo compartilham a original, e mexer nela repintaria todas. */
  const geo = original.clone();
  lixo.push(geo);
  malha.geometry = geo;

  const base = Array.isArray(malha.material) ? malha.material[0]! : malha.material;
  const materiais: THREE.Material[] = [];
  const juntos = new Uint32Array(idx.length);
  let inicio = 0;
  geo.clearGroups();
  porFaixa.forEach((tris, faixa) => {
    if (tris.length === 0) return;
    juntos.set(tris, inicio);
    geo.addGroup(inicio, tris.length, materiais.length);
    if (faixa === 0) {
      materiais.push(base);
    } else {
      const { cor, metal, aspereza } = regras[faixa - 1]!;
      const copia = (base as THREE.MeshStandardMaterial).clone();
      copia.color.set(cor);
      if (metal !== undefined) copia.metalness = metal;
      if (aspereza !== undefined) copia.roughness = aspereza;
      copia.needsUpdate = true;
      lixo.push(copia);
      materiais.push(copia);
    }
    inicio += tris.length;
  });
  geo.setIndex(new THREE.BufferAttribute(juntos, 1));
  malha.material = materiais;
}

/** Tira da cena as peças que não entram em nenhum modelo. */
export function esconder(ilha: THREE.Object3D, nomes: string[]): Descartaveis {
  const lixo: Descartaveis = [];
  for (const nome of nomes) {
    const peca = ilha.getObjectByName(nome);
    if (!peca) continue;
    peca.visible = false;
    lixo.push({ dispose: () => { peca.visible = true; } });
  }
  return lixo;
}

/**
 * Reescreve a UV de uma malha como projeção em caixa, medida no mundo.
 *
 * Para cada triângulo, escolhe o eixo em que a normal é mais forte e usa os
 * outros dois como U e V. É o que salva um modelo cuja UV não foi feita para
 * textura — as faces param de pegar cada uma um pedaço diferente do veio.
 *
 * A geometria perde o índice: um vértice de canto pertence a triângulos de
 * eixos diferentes, e cada um deles quer uma UV própria ali.
 *
 * Medir no mundo é o que faz o veio sair do mesmo tamanho em móveis que
 * entraram com escalas diferentes — a estante de nichos, por exemplo, entra
 * esticada em três eixos por números diferentes.
 */
function projetarUV(malha: THREE.Mesh, metrosPorVolta: number) {
  const solta = malha.geometry.toNonIndexed();
  const pos = solta.attributes.position;
  if (!pos) return null;

  malha.updateWorldMatrix(true, false);
  const mundo = malha.matrixWorld;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), n = new THREE.Vector3();
  const uv = new Float32Array(pos.count * 2);

  for (let t = 0; t + 2 < pos.count; t += 3) {
    a.fromBufferAttribute(pos, t).applyMatrix4(mundo);
    b.fromBufferAttribute(pos, t + 1).applyMatrix4(mundo);
    c.fromBufferAttribute(pos, t + 2).applyMatrix4(mundo);
    n.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a));
    const nx = Math.abs(n.x), ny = Math.abs(n.y), nz = Math.abs(n.z);
    /* Os dois eixos que sobram depois do dominante. Numa face virada para
       cima, U e V são X e Z — que é o que faz o veio do piso correr no
       comprimento das tábuas, e não atravessado. */
    const [eu, ev] = ny >= nx && ny >= nz
      ? (["x", "z"] as const)
      : nx >= nz
        ? (["z", "y"] as const)
        : (["x", "y"] as const);
    for (const [i, ponto] of [[t, a], [t + 1, b], [t + 2, c]] as const) {
      uv[i * 2] = ponto[eu] / metrosPorVolta;
      uv[i * 2 + 1] = ponto[ev] / metrosPorVolta;
    }
  }

  solta.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  malha.geometry = solta;
  return solta;
}

/**
 * Uma cópia do material cuja textura se repete fora do 0..1.
 *
 * A UV projetada passa de 1, e o mapa vem do arquivo dono — a mesa de centro
 * usa o mesmo. Mexer no modo de repetição dele mudaria a mesa junto, então
 * material e textura viram cópia. A cópia da textura compartilha a imagem já
 * decodificada; o que ela ganha é o próprio modo de repetição.
 */
function repetirMapa(material: THREE.Material, lixo: Descartaveis) {
  const copia = (material as THREE.MeshStandardMaterial).clone();
  const mapa = copia.map;
  if (mapa) {
    const repetido = mapa.clone();
    repetido.wrapS = THREE.RepeatWrapping;
    repetido.wrapT = THREE.RepeatWrapping;
    repetido.needsUpdate = true;
    copia.map = repetido;
    lixo.push(repetido);
  }
  copia.needsUpdate = true;
  lixo.push(copia);
  return copia;
}

/**
 * Reescreve a UV de uma malha como um plano sobre os dois eixos maiores dela.
 *
 * A geometria é compartilhada entre as cópias do mesmo arquivo, então isto
 * roda uma vez e vale para as três lousas — que é o que se quer, já que todas
 * são pintadas do mesmo jeito.
 */
function planificarUV(malha: THREE.Mesh) {
  const geo = malha.geometry;
  geo.computeBoundingBox();
  const caixa = geo.boundingBox;
  if (!caixa) return;

  const tamanho = caixa.getSize(new THREE.Vector3());
  const eixos = (["x", "y", "z"] as const)
    .slice()
    .sort((a, b) => tamanho[b] - tamanho[a]);

  /* Dos dois eixos da face, o "de cima" da textura é o que aponta para o alto
     no mundo — e não o menor dos dois. Escolher pelo tamanho pôs a faixa azul
     do quadro de pé, virada, numa tira na lateral: no arquivo o eixo comprido
     da chapa é a altura, não a largura. */
  const rotacao = new THREE.Matrix3().setFromMatrix4(malha.matrixWorld);
  const paraCima = (eixo: "x" | "y" | "z") => {
    const v = new THREE.Vector3(
      eixo === "x" ? 1 : 0,
      eixo === "y" ? 1 : 0,
      eixo === "z" ? 1 : 0,
    );
    return Math.abs(v.applyMatrix3(rotacao).normalize().y);
  };
  const face = [eixos[0]!, eixos[1]!];
  const vertical = paraCima(face[0]!) >= paraCima(face[1]!) ? face[0]! : face[1]!;
  const horizontal = vertical === face[0] ? face[1]! : face[0]!;

  const pos = geo.attributes.position;
  if (!pos) return;
  const uv = new Float32Array(pos.count * 2);
  const ponto = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    ponto.fromBufferAttribute(pos, i);
    uv[i * 2] = (ponto[horizontal] - caixa.min[horizontal]) / (tamanho[horizontal] || 1);
    uv[i * 2 + 1] = (ponto[vertical] - caixa.min[vertical]) / (tamanho[vertical] || 1);
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

/** Encaixa a lista inteira, sem deixar um erro de um arquivo derrubar os outros. */
export async function encaixarModelos(
  ilha: THREE.Object3D,
  encaixes: Encaixe[],
): Promise<Descartaveis> {
  const listas = await Promise.all([
    ...encaixes.map((encaixe) =>
      encaixarModelo(ilha, encaixe).catch(() => [] as Descartaveis),
    ),
    /* O piso entra aqui porque depende do mesmo download: a madeira dele é a
       dos móveis, e ela vem de dentro de um .glb. */
    amadeirarPiso(ilha).catch(() => [] as Descartaveis),
  ]);
  return listas.flat();
}

/**
 * Põe nas tábuas do piso a mesma madeira dos móveis.
 *
 * As tábuas nascem em `cena.ts` com uma cor lisa, porque lá a madeira ainda
 * não existe — ela mora dentro de um .glb e só chega depois do download. A cor
 * de cada uma continua sendo a de lá; o que entra aqui é o veio por cima.
 *
 * A UV é projetada no mundo, tábua por tábua, com a mesma medida para todas:
 * é isso que faz o veio atravessar as emendas em vez de recomeçar em cada
 * tábua — que é o que a UV própria de uma caixa daria, uma volta inteira da
 * textura em cada pedaço, mais apertada nos pedaços curtos.
 */
async function amadeirarPiso(ilha: THREE.Object3D): Promise<Descartaveis> {
  const lixo: Descartaveis = [];
  const madeiraDoArquivo = acharMaterial(
    await baixar(ARQUIVO_DA_MADEIRA),
    MATERIAL_DA_MADEIRA,
  );
  const mapa = (madeiraDoArquivo as THREE.MeshStandardMaterial | undefined)?.map;
  if (!mapa) return lixo;

  const veio = mapa.clone();
  veio.wrapS = THREE.RepeatWrapping;
  veio.wrapT = THREE.RepeatWrapping;
  veio.needsUpdate = true;
  lixo.push(veio);

  /* Uma cópia de material por cor de tábua, não por tábua: são mais de duzentas
     tábuas e duas cores, alternadas. */
  const porCor = new Map<THREE.Material, THREE.Material>();
  ilha.updateWorldMatrix(true, true);

  ilha.traverse((no) => {
    if (!no.name.startsWith("floor_plank_")) return;
    const malha = no as THREE.Mesh;
    if (!malha.isMesh || Array.isArray(malha.material)) return;

    /* As tábuas são da cena, não de um modelo: elas continuam vivas depois que
       a ilha se desfaz. Então geometria e material voltam a ser os de antes no
       descarte — sem isso, a caixa original de cada tábua ficaria sem dono e a
       remontagem projetaria por cima de uma projeção. */
    const geoAntiga = malha.geometry;
    const geo = projetarUV(malha, METROS_POR_VOLTA_NO_PISO);
    if (geo) {
      lixo.push(geo);
      lixo.push({ dispose: () => { malha.geometry = geoAntiga; } });
    }

    const original = malha.material;
    let comVeio = porCor.get(original);
    if (!comVeio) {
      const copia = (original as THREE.MeshStandardMaterial).clone();
      copia.map = veio;
      copia.needsUpdate = true;
      lixo.push(copia);
      porCor.set(original, copia);
      comVeio = copia;
    }
    malha.material = comVeio;
    lixo.push({ dispose: () => { malha.material = original; } });
  });

  return lixo;
}
