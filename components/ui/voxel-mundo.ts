/**
 * O mundo voxel que fica atrás do site inteiro.
 *
 * Gerado por código, não desenhado à mão: com seis lugares e alguns milhares
 * de cubos, escrever camada por camada em texto seria impraticável. Aqui há
 * peças (casa, árvore, torre, carro) que são posicionadas ao longo do eixo Z,
 * uma por seção da página.
 *
 * Tudo vira UM InstancedMesh, então o mundo inteiro custa uma chamada de
 * desenho, independente de quantos cubos tiver.
 */

export type Voxel = { x: number; y: number; z: number; cor: string };

export const COR = {
  grama: "#2f5d3a",
  gramaEscura: "#274d31",
  asfalto: "#26262b",
  calcada: "#4a4a52",
  parede: "#8a8073",
  paredeFria: "#6f6a63",
  telhado: "#7c3626",
  telhadoAzul: "#2f5f78",
  madeira: "#6b4a2f",
  tronco: "#4a3728",
  folha: "#3f7a45",
  folhaClara: "#4f9455",
  vidro: "#7fd4d4",
  metal: "#5a5f66",
  carro: "#2f6d78",
  carroVerm: "#8a3a2f",
  zumbi: "#5f7a45",
  acento: "#4ee1c1",
  caixa: "#7a5c3a",
  concreto: "#3a3d42",
} as const;

/* Cada seção da página ocupa uma faixa do mundo, espaçadas no eixo Z. */
export const PASSO_Z = 26;
export const LUGARES = 6;

type Add = (v: Voxel) => void;

function bloco(
  add: Add,
  x: number, y: number, z: number,
  larg: number, alt: number, prof: number,
  cor: string,
  oco = false,
) {
  for (let i = 0; i < larg; i++)
    for (let j = 0; j < alt; j++)
      for (let k = 0; k < prof; k++) {
        /* Oco: só as bordas. Economiza cubos que ninguém veria de fora. */
        if (oco && i > 0 && i < larg - 1 && k > 0 && k < prof - 1) continue;
        add({ x: x + i, y: y + j, z: z + k, cor });
      }
}

function chao(add: Add, z0: number) {
  bloco(add, -9, -1, z0, 18, 1, 18, COR.grama);
  bloco(add, -9, -1, z0 + 15, 18, 1, 3, COR.asfalto);
  bloco(add, -9, -1, z0 + 14, 18, 1, 1, COR.calcada);
}

function casa(add: Add, x: number, z: number, corTelhado: string) {
  bloco(add, x, 0, z, 7, 3, 6, COR.parede, true);
  add({ x: x + 3, y: 1, z: z, cor: COR.vidro });
  add({ x: x + 3, y: 1, z: z + 5, cor: COR.vidro });
  bloco(add, x - 1, 3, z - 1, 9, 1, 8, corTelhado);
  bloco(add, x, 4, z, 7, 1, 6, corTelhado);
  bloco(add, x + 2, 5, z + 2, 3, 1, 2, corTelhado);
}

function arvore(add: Add, x: number, z: number) {
  bloco(add, x, 0, z, 1, 3, 1, COR.tronco);
  bloco(add, x - 2, 3, z - 2, 5, 2, 5, COR.folha);
  bloco(add, x - 1, 5, z - 1, 3, 1, 3, COR.folhaClara);
}

function carro(add: Add, x: number, z: number, cor: string) {
  bloco(add, x, 0, z, 6, 1, 3, cor);
  bloco(add, x + 1, 1, z, 3, 1, 3, cor);
  add({ x: x + 2, y: 1, z: z, cor: COR.vidro });
  add({ x: x + 2, y: 1, z: z + 2, cor: COR.vidro });
}

function torre(add: Add, x: number, z: number, altura: number, cor: string) {
  bloco(add, x, 0, z, 5, altura, 5, cor, true);
  /* Janelas em fileiras alternadas: dá escala ao prédio. */
  for (let y = 1; y < altura - 1; y += 2) {
    add({ x: x + 1, y, z, cor: COR.vidro });
    add({ x: x + 3, y, z, cor: COR.vidro });
    add({ x: x, y, z: z + 2, cor: COR.vidro });
  }
  bloco(add, x - 1, altura, z - 1, 7, 1, 7, COR.concreto);
}

function pilhaDeCaixas(add: Add, x: number, z: number) {
  const alturas = [3, 2, 4, 1, 3];
  alturas.forEach((h, i) => bloco(add, x + i * 3, 0, z, 2, h, 2, COR.caixa));
}

function antena(add: Add, x: number, z: number) {
  bloco(add, x, 0, z, 3, 2, 3, COR.concreto);
  bloco(add, x + 1, 2, z + 1, 1, 10, 1, COR.metal);
  bloco(add, x, 8, z, 3, 1, 3, COR.metal);
  add({ x: x + 1, y: 12, z: z + 1, cor: COR.acento });
}

function zumbi(add: Add, x: number, z: number) {
  bloco(add, x, 0, z, 1, 2, 1, COR.zumbi);
}

/** Monta o mundo inteiro, um lugar por seção. */
export function montarMundo(): Voxel[] {
  const voxels: Voxel[] = [];
  const add: Add = (v) => voxels.push(v);

  for (let i = 0; i < LUGARES; i++) {
    const z = i * PASSO_Z;
    chao(add, z);

    if (i === 0) {
      // hero: um pedaço de subúrbio
      casa(add, -7, z + 3, COR.telhado);
      casa(add, 3, z + 5, COR.telhadoAzul);
      arvore(add, 0, z + 2);
      carro(add, -3, z + 15, COR.carro);
      zumbi(add, 6, z + 14);
    } else if (i === 1) {
      // sobre: uma casa só, com árvore e o carro na porta
      casa(add, -3, z + 4, COR.telhado);
      arvore(add, 5, z + 6);
      arvore(add, -7, z + 8);
      carro(add, 1, z + 15, COR.carroVerm);
    } else if (i === 2) {
      // stack: galpão com caixas empilhadas
      bloco(add, -8, 0, z + 3, 16, 1, 10, COR.concreto);
      pilhaDeCaixas(add, -7, z + 5);
      pilhaDeCaixas(add, -7, z + 9);
      arvore(add, 7, z + 2);
    } else if (i === 3) {
      // projetos: três prédios
      torre(add, -8, z + 4, 9, COR.paredeFria);
      torre(add, -1, z + 6, 13, COR.parede);
      torre(add, 5, z + 3, 7, COR.paredeFria);
      carro(add, -2, z + 15, COR.carro);
    } else if (i === 4) {
      // mods: a oficina, com carro aberto e caixas
      bloco(add, -8, 0, z + 4, 12, 4, 8, COR.metal, true);
      bloco(add, -8, 4, z + 3, 12, 1, 10, COR.concreto);
      carro(add, -5, z + 7, COR.carroVerm);
      pilhaDeCaixas(add, 4, z + 6);
      zumbi(add, -1, z + 14);
    } else {
      // contato: a antena de rádio
      antena(add, -2, z + 6);
      casa(add, 4, z + 4, COR.telhadoAzul);
      arvore(add, -7, z + 9);
      carro(add, 0, z + 15, COR.carro);
    }
  }

  return voxels;
}
