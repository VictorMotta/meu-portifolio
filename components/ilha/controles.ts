import * as THREE from "three";

import type { ChavePonto } from "@/components/ilha/pontos";

/**
 * Qual seção o visitante quer ver quando clica num móvel.
 *
 * A busca sobe do triângulo acertado até achar um móvel conhecido, e o
 * primeiro encontrado ganha: o monitor da esquerda está dentro da mesa, então
 * clicar na tela leva ao Sobre e clicar no tampo também — mas clicar na tela
 * nunca é entendido como clique na mesa.
 */
const MOVEL_PARA_PONTO: Record<string, ChavePonto> = {
  monitor_left: "sobre",
  desk: "sobre",
  gaming_chair: "sobre",
  pc_tower: "sobre",
  whiteboard: "stack",
  project_board: "projetos",
  monitor_right: "contato",
  macbook: "contato",
  tv_wall: "mods",
  arcade_cabinet: "jogos",
  sofa: "mods",
  coffee_table: "mods",
  resume_easel: "curriculo",
};

export function pontoDoObjeto(objeto: THREE.Object3D): ChavePonto | null {
  for (let no: THREE.Object3D | null = objeto; no; no = no.parent) {
    const chave = MOVEL_PARA_PONTO[no.name];
    if (chave) return chave;
  }
  return null;
}

/** Onde a câmera está em volta da ilha, na vista geral. */
export type Orbita = {
  /** Giro horizontal, em radianos. */
  angulo: number;
  /** Altura do olhar, em radianos, entre quase rente ao deck e quase de cima. */
  elevacao: number;
  /** Distância, como fator do enquadramento calculado para a ilha inteira. */
  zoom: number;
};

export const ORBITA_INICIAL: Orbita = {
  angulo: 0.6,
  /* 0,30 e não 0,40, e a diferença é céu.
     A abertura vertical da câmera é 45°, então o topo do quadro fica sempre a
     `elevacao − 22,5°`. Em 0,40 rad (22,9°) isso dava 0,4° ABAIXO da linha do
     horizonte: a ilha aparecia inteira, mas não sobrava um grau de céu acima
     dela, e o Sol vivia cortado pela borda de cima. Em 0,30 (17,2°) abrem-se
     5,3° de céu de verdade — o bastante para o Sol e a Lua caberem inteiros
     acima da sala. A ilha continua vista de cima, só que um pouco menos. */
  elevacao: 0.3,
  zoom: 1,
};

/* Olhar de baixo do deck não mostra nada além da rocha; de cima demais a ilha
   vira uma planta baixa. */
export const ELEVACAO_MINIMA = 0.12;
export const ELEVACAO_MAXIMA = 1.15;

/* O piso do zoom foi 0,72, escolhido quando a câmera só sabia orbitar o CENTRO
   da ilha: dali para dentro ela entrava no sofá, e não havia como chegar perto
   de um móvel sem atravessar outro. Com o passeio de dois dedos a pergunta
   mudou — dá para levar a vista até a peça antes de aproximar —, e 0,72 virou
   um teto baixo demais para um celular, onde a ilha inteira cabe em poucos
   centímetros de tela. Em 0,45 a mobília enche o quadro e a câmera ainda para
   antes do deck. */
export const ZOOM_MINIMO = 0.45;
export const ZOOM_MAXIMO = 1.7;

/**
 * Até onde o passeio de dois dedos pode levar a vista, como fator da meia
 * largura do deck.
 *
 * Existe porque o passeio move a câmera E o foco juntos: sem limite, dois
 * arrastos levam a ilha para fora do quadro e o visitante fica olhando o
 * oceano, sem nada na tela que explique como voltar.
 *
 * 0,45 e não 1. Em 1 o centro da vista chega à BORDA do deck, e ali metade do
 * quadro já é oceano: a ilha ficava encolhida num canto, o que é sair dela e
 * não andar por ela — dá para ver isso na captura, com o deck espremido no
 * alto à esquerda. Em 0,45 o centro para na metade do caminho até a borda,
 * onde a mobília do lado escolhido enche o quadro e o resto da ilha continua
 * na tela dando a referência de onde se está.
 */
export const PASSEIO_MAXIMO = 0.45;

export function limitarOrbita(orbita: Orbita): Orbita {
  return {
    angulo: orbita.angulo,
    elevacao: THREE.MathUtils.clamp(
      orbita.elevacao,
      ELEVACAO_MINIMA,
      ELEVACAO_MAXIMA,
    ),
    zoom: THREE.MathUtils.clamp(orbita.zoom, ZOOM_MINIMO, ZOOM_MAXIMO),
  };
}

/** Quanto o ponteiro pode andar entre apertar e soltar e ainda contar como clique. */
export const LIMIAR_DE_CLIQUE = 6;
