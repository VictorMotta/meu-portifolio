import * as THREE from "three";

/**
 * As lamparinas da ilha acendem no escuro e apagam no claro.
 *
 * A ilha é a mesma nos dois temas — trocar a paleta dela junto com a do site
 * faria o móvel mudar de cor, e móvel não muda de cor quando a luz do quarto
 * acende. O que muda é o que uma sala de verdade muda: de dia a lamparina
 * fica apagada, de noite acesa.
 *
 * São duas: a de chão, ao lado do sofá, e a de teto, no meio da ilha. O tema
 * decide o estado INICIAL das duas; daí em diante cada uma tem interruptor
 * próprio, que é clicar nela. Já foi um interruptor só para as duas, com o
 * argumento de que acender uma deixaria metade do deck clara e a outra não —
 * o que é verdade, e é justamente a graça de poder apagar uma.
 *
 * A luz direcional e a hemisférica da cena continuam ligadas nos dois temas.
 * Elas é que garantem que o portfólio seja legível; a lamparina é atmosfera,
 * e atmosfera pode apagar.
 */

/**
 * A intensidade de fábrica de cada coisa que acende.
 *
 * Precisa ser guardada porque apagar é escrever zero, e sem isto acender de
 * volta seria chutar o número. `WeakMap` para não segurar material nenhum
 * vivo depois que a ilha sai de cena.
 */
const deFabrica = new WeakMap<object, number>();

/**
 * Os grupos das duas lamparinas — o que se clica e o que carrega o filamento.
 *
 * A luz pontual de cada uma é `<grupo>_light`, derivada e não escrita à mão:
 * era uma segunda lista, e uma segunda lista é uma lista para esquecer de
 * atualizar.
 */
export const LAMPARINAS = ["floor_lamp", "ceiling_lamp"] as const;

export type Lamparina = (typeof LAMPARINAS)[number];

/** O estado das duas, no formato que `acenderLamparinas` consome. */
export type Acesas = Record<Lamparina, boolean>;

/** O estado que o tema pede: de noite acesas, de dia apagadas. */
export const acesasPeloTema = (escuro: boolean): Acesas => ({
  floor_lamp: escuro,
  ceiling_lamp: escuro,
});

/**
 * De qual lamparina é a peça clicada, se é que é de alguma.
 *
 * Sobe pelos pais como `oQueCai` e `pontoDoObjeto`, e pelo mesmo motivo: quem
 * o raio acerta é uma malha lá dentro do `.glb` — `lamparina_teto_modelo_...`
 * —, nunca o grupo. Nenhuma das duas está em `MOVEL_PARA_PONTO` nem entre as
 * coisas que caem, então o clique não é disputado com ninguém.
 */
export function aLamparinaDe(objeto: THREE.Object3D): Lamparina | null {
  for (let no: THREE.Object3D | null = objeto; no; no = no.parent) {
    const achou = LAMPARINAS.find((nome) => nome === no.name);
    if (achou) return achou;
  }
  return null;
}

function guardar<T extends object>(alvo: T, valor: number) {
  if (!deFabrica.has(alvo)) deFabrica.set(alvo, valor);
  return deFabrica.get(alvo) ?? valor;
}

export function acenderLamparinas(ilha: THREE.Object3D, acesas: Acesas) {
  for (const nome of LAMPARINAS) {
    const acesa = acesas[nome];

    const luz = ilha.getObjectByName(`${nome}_light`) as
      | THREE.PointLight
      | undefined;
    if (luz?.isLight) {
      const original = guardar(luz, luz.intensity);
      luz.intensity = acesa ? original : 0;
    }

    const grupo = ilha.getObjectByName(nome);
    if (!grupo) continue;
    grupo.traverse((no) => {
      const malha = no as THREE.Mesh;
      if (!malha.isMesh) return;
      /* Só o que está em cena.
         As duas lâmpadas DESENHADAS nascem com o mesmo `M.bulb` de `cena.ts`
         — uma instância de material para as duas —, e a de teto está
         escondida desde que o .glb entrou no lugar dela. Sem este filtro,
         apagar a lamparina de teto escrevia zero num material que a de chão
         também usa: com um interruptor só para as duas isso nunca apareceu,
         com um interruptor para cada uma apareceria na hora em que a peça
         desenhada voltasse à cena. Peça fora de cena não tem filamento para
         acender. */
      if (!malha.visible) return;
      const materiais = Array.isArray(malha.material)
        ? malha.material
        : [malha.material];
      for (const bruto of materiais) {
        const material = bruto as THREE.MeshStandardMaterial;
        /* Só o que já nasceu emissivo. A cúpula e o cabo são material comum, e
           escrever `emissiveIntensity` neles não faria nada visível hoje —
           mas faria no dia em que alguém desse emissivo a eles por outro
           motivo, e a lamparina apagada acenderia sozinha. */
        if (!material?.emissive) continue;
        const { r, g, b } = material.emissive;
        if (r + g + b === 0) continue;
        const original = guardar(material, material.emissiveIntensity);
        material.emissiveIntensity = acesa ? original : 0;
      }
    });
  }
}
