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
  elevacao: 0.4,
  zoom: 1,
};

/* Olhar de baixo do deck não mostra nada além da rocha; de cima demais a ilha
   vira uma planta baixa. E o zoom para antes de a câmera entrar na mobília:
   mais perto que isso e o visitante fica dentro do sofá. */
export const ELEVACAO_MINIMA = 0.12;
export const ELEVACAO_MAXIMA = 1.15;
export const ZOOM_MINIMO = 0.72;
export const ZOOM_MAXIMO = 1.7;

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
