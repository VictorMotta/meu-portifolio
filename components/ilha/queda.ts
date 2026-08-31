import * as THREE from "three";

import type { Obstaculo } from "@/components/ilha/camera-ilha";

/**
 * Derrubar as coisas da ilha.
 *
 * É uma física de brinquedo escrita à mão, e isso é uma escolha: um motor de
 * verdade (rapier, cannon) resolveria empilhamento e atrito, mas custa mais de
 * um megabyte de WebAssembly para um portfólio em que a única pergunta é "a
 * caneca cai da mesa quando eu clico nela?". Aqui são gravidade, quique e
 * amortecimento — o suficiente para a resposta ser sim.
 *
 * O objeto sai do móvel onde estava e passa a viver na raiz da ilha, mantendo
 * a posição no mundo. `arrumar` devolve cada um para o pai e a transformação
 * originais, então a bagunça é sempre reversível.
 */

const GRAVIDADE = 9.8;
/** Quanto da velocidade sobrevive a um quique. */
const RESTITUICAO = 0.34;
/** Atrito com o chão a cada quique. */
const ATRITO = 0.62;
/** Abaixo disso o objeto para de vez, senão fica tremendo no chão para sempre. */
const LIMIAR_DE_REPOUSO = 0.12;

export type Caido = {
  objeto: THREE.Object3D;
  /* Para onde volta quando o visitante arruma a ilha. */
  pai: THREE.Object3D;
  posicao: THREE.Vector3;
  rotacao: THREE.Quaternion;
  velocidade: THREE.Vector3;
  giro: THREE.Vector3;
  parado: boolean;
};

/* Objetos que são de pegar: pequenos, apoiados em alguma superfície e sem
   função estrutural. Derrubar o sofá ou o monitor seria engraçado uma vez e
   destruiria a cena para sempre. */
const GRUPOS_SOLTOS = new Set(["mug"]);

const SOLTOS = [
  /^book_\d+$/,
  /^game_case_\d+$/,
  /^shipped_project(_label)?_\d+$/,
  /^snack_bowl(_inner)?$/,
  /^(trash_paper|throw_pillow|soda_can|snacks|mouse|arcade_ball|coffee)$/,
];

/**
 * O que cai quando este objeto é clicado, ou null se ele é cenário fixo.
 *
 * A caneca é um grupo (corpo, alça e café), então o clique em qualquer parte
 * dela derruba o conjunto. O resto é peça única.
 */
export function oQueCai(objeto: THREE.Object3D): THREE.Object3D | null {
  for (let no: THREE.Object3D | null = objeto; no; no = no.parent) {
    if (GRUPOS_SOLTOS.has(no.name)) return no;
  }
  return SOLTOS.some((padrao) => padrao.test(objeto.name)) ? objeto : null;
}

/**
 * Tira o objeto do móvel e o joga para longe de quem clicou.
 *
 * `attach` preserva a posição no mundo: sem ele o objeto saltaria para a
 * origem da ilha no instante do clique.
 */
export function derrubar(
  raiz: THREE.Object3D,
  objeto: THREE.Object3D,
  daCamera: THREE.Vector3,
): Caido {
  const estado: Caido = {
    objeto,
    pai: objeto.parent ?? raiz,
    posicao: objeto.position.clone(),
    rotacao: objeto.quaternion.clone(),
    velocidade: new THREE.Vector3(),
    giro: new THREE.Vector3(),
    parado: false,
  };

  raiz.attach(objeto);

  /* Empurrão na direção em que o clique veio, achatado no plano do chão, mais
     um tranco para cima: sem ele o objeto só escorregaria em vez de tombar. */
  const empurrao = daCamera.clone().setY(0);
  if (empurrao.lengthSq() < 1e-6) empurrao.set(1, 0, 0);
  empurrao.normalize().multiplyScalar(1.1 + Math.random() * 0.7);

  estado.velocidade.set(empurrao.x, 1.9 + Math.random() * 0.8, empurrao.z);
  estado.giro.set(
    (Math.random() - 0.5) * 11,
    (Math.random() - 0.5) * 11,
    (Math.random() - 0.5) * 11,
  );
  return estado;
}

const caixa = new THREE.Box3();
const eixo = new THREE.Vector3();

/**
 * A altura em que este objeto vai parar de cair.
 *
 * Sem isto o livro derrubado atravessa a prateleira, a mesa e o sofá e vai
 * parar no deck, o que parece defeito e não brincadeira. A conta é simples:
 * entre as peças da ilha que estão logo abaixo dele, a mais alta é onde ele
 * pousa. Não é colisão de verdade — o objeto ainda pode escorregar para fora
 * do apoio no ar — mas resolve o caso que se vê.
 */
function alturaDoApoio(
  obstaculos: Obstaculo[],
  caindo: Set<THREE.Object3D>,
  x: number,
  z: number,
  base: number,
  chao: number,
): number {
  let apoio = chao;
  for (const o of obstaculos) {
    if (caindo.has(o.objeto)) continue;
    const c = o.caixa;
    if (x < c.min.x || x > c.max.x || z < c.min.z || z > c.max.z) continue;
    /* Só conta o que está abaixo: a prateleira acima da cabeça do objeto não
       é chão dele. A folga aceita o instante em que ele já encostou. */
    if (c.max.y > base + 0.02) continue;
    if (c.max.y > apoio) apoio = c.max.y;
  }
  return apoio;
}

/**
 * Um passo de simulação.
 *
 * O chão é medido pela caixa do objeto a cada quadro, e não por um raio fixo:
 * um livro tombado encosta numa altura diferente de um livro em pé, e usar a
 * esfera envolvente deixaria tudo flutuando visivelmente acima do deck.
 */
export function integrar(
  caidos: Caido[],
  obstaculos: Obstaculo[],
  chao: number,
  dt: number,
) {
  const passo = Math.min(dt, 1 / 30);

  /* As caixas guardadas dos objetos que estão caindo estão desatualizadas —
     eles saíram do lugar. Nenhum deles serve de apoio para os outros. */
  const caindo = new Set(caidos.map((c) => c.objeto));

  for (const c of caidos) {
    if (c.parado) continue;

    c.velocidade.y -= GRAVIDADE * passo;
    c.objeto.position.addScaledVector(c.velocidade, passo);

    const giro = c.giro.length();
    if (giro > 1e-4) {
      eixo.copy(c.giro).divideScalar(giro);
      c.objeto.rotateOnWorldAxis(eixo, giro * passo);
    }

    c.objeto.updateMatrixWorld(true);
    caixa.setFromObject(c.objeto);

    const apoio = alturaDoApoio(
      obstaculos,
      caindo,
      c.objeto.position.x,
      c.objeto.position.z,
      caixa.min.y,
      chao,
    );
    const afundou = apoio - caixa.min.y;

    if (afundou > 0) {
      c.objeto.position.y += afundou;
      c.velocidade.y = Math.abs(c.velocidade.y) * RESTITUICAO;
      c.velocidade.x *= ATRITO;
      c.velocidade.z *= ATRITO;
      c.giro.multiplyScalar(ATRITO);

      if (
        c.velocidade.length() < LIMIAR_DE_REPOUSO &&
        c.giro.length() < LIMIAR_DE_REPOUSO * 4
      ) {
        c.parado = true;
        c.velocidade.set(0, 0, 0);
        c.giro.set(0, 0, 0);
      }
    }
  }
}

/** Devolve tudo para o lugar de onde saiu. */
export function arrumar(caidos: Caido[]) {
  for (const c of caidos) {
    c.pai.add(c.objeto);
    c.objeto.position.copy(c.posicao);
    c.objeto.quaternion.copy(c.rotacao);
  }
}
