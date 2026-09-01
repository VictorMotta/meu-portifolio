import * as THREE from "three";

/**
 * As lamparinas da ilha acendem no escuro e apagam no claro.
 *
 * A ilha é a mesma nos dois temas — trocar a paleta dela junto com a do site
 * faria o móvel mudar de cor, e móvel não muda de cor quando a luz do quarto
 * acende. O que muda é o que uma sala de verdade muda: de dia a lamparina
 * fica apagada, de noite acesa.
 *
 * São duas: a de chão, ao lado do sofá, e a de teto, no meio da ilha. As duas
 * seguem o mesmo interruptor, porque acender uma só deixaria metade do deck
 * clara e a outra não.
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

/** As luzes pontuais das duas lamparinas. */
const LUZES = ["floor_lamp_light", "ceiling_lamp_light"];

/** Os grupos cujos materiais emissivos são o filamento aceso. */
const GRUPOS = ["floor_lamp", "ceiling_lamp"];

function guardar<T extends object>(alvo: T, valor: number) {
  if (!deFabrica.has(alvo)) deFabrica.set(alvo, valor);
  return deFabrica.get(alvo) ?? valor;
}

export function acenderLamparinas(ilha: THREE.Object3D, acesas: boolean) {
  for (const nome of LUZES) {
    const luz = ilha.getObjectByName(nome) as THREE.PointLight | undefined;
    if (!luz?.isLight) continue;
    const original = guardar(luz, luz.intensity);
    luz.intensity = acesas ? original : 0;
  }

  for (const nome of GRUPOS) {
    const grupo = ilha.getObjectByName(nome);
    if (!grupo) continue;
    grupo.traverse((no) => {
      const malha = no as THREE.Mesh;
      if (!malha.isMesh) return;
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
        material.emissiveIntensity = acesas ? original : 0;
      }
    });
  }
}
