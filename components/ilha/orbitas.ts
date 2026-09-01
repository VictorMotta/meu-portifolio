import * as THREE from "three";

/**
 * O que se move sozinho no céu e em volta da ilha.
 *
 * A ilha é um planeta, e planeta não fica parado: tem pedras em órbita, e o
 * céu dele anda. Isto aqui é o relógio disso — uma função por corpo, todas
 * dirigidas pelo mesmo tempo em segundos, para nada sair de fase quando uma
 * cena monta antes da outra.
 *
 * Movimento por TEMPO e não por quadro acumulado. Somar um passo a cada
 * quadro faria a velocidade depender da taxa de atualização da tela: a mesma
 * pedra daria a volta duas vezes mais rápido num monitor de 120 Hz, e travar
 * a aba deixaria tudo para trás. Com `posição = f(tempo)`, o corpo está onde
 * deveria estar mesmo que a página tenha ficado escondida meio minuto.
 */

/**
 * As pedras que flutuam em volta da ilha.
 *
 * Cada uma carrega o próprio raio, ângulo inicial e altura em
 * `userData.orbita`, escritos em `cena.ts` a partir de onde ela foi
 * desenhada. Aqui só se avança o ângulo — a órbita é circular e horizontal,
 * que é o que se lê de longe; uma elipse inclinada custaria mais conta para
 * uma diferença que ninguém enxerga a esta distância.
 */
export function orbitarPedras(ilha: THREE.Object3D, tempo: number) {
  for (let i = 1; i <= 4; i++) {
    const pedra = ilha.getObjectByName(`floating_rock_${i}`);
    const o = pedra?.userData?.orbita as
      | { raio: number; angulo: number; altura: number; velocidade: number; giro: number }
      | undefined;
    if (!pedra || !o) continue;
    const angulo = o.angulo + tempo * o.velocidade;
    pedra.position.set(
      Math.cos(angulo) * o.raio,
      o.altura,
      Math.sin(angulo) * o.raio,
    );
    pedra.rotation.y = angulo * o.giro * 6;
  }
}

/**
 * Quanto o céu inteiro roda por segundo.
 *
 * Uma volta em UMA HORA, e o número saiu de medir. É este giro que faz o Sol e
 * a Lua atravessarem o céu, e atravessar o céu é o que a ilha orbitando o Sol
 * PARECE de dentro da ilha: a câmera está presa nela, então não há como
 * mostrar a ilha dando a volta por fora — o que se vê de um planeta é o astro
 * andando, não o planeta.
 *
 * Em vinte minutos, que foi a primeira tentativa, dava 18° por minuto: numa
 * visita de três minutos a Lua saía do lugar onde foi posta para ser vista.
 * Em uma hora são 6° por minuto — anda o bastante para não parecer adesivo, e
 * devagar o bastante para o astro continuar no quadro enquanto se lê a página.
 */
const VOLTA_DO_CEU = (2 * Math.PI) / (60 * 60);

/**
 * E quanto cada planeta anda ALÉM do céu.
 *
 * Planeta quer dizer "errante", e é literalmente isto: o que separa um planeta
 * de uma estrela, a olho nu, é que ele anda em relação às outras. Sem este
 * acréscimo os seis ficariam pregados na constelação e o céu seria um adesivo
 * girando.
 *
 * Uma volta entre oito e dezesseis minutos, cada um no seu passo — os números
 * quebrados evitam que dois voltem a se alinhar tão cedo.
 *
 * Entre quatro e nove, que foi a primeira tentativa, um planeta atravessava o
 * quadro em quinze segundos. Fundo que corre assim disputa com o texto: o
 * movimento tem de ser notado quando se olha para ele, não enquanto se lê.
 */
const PERIODOS = [8.3, 11.9, 15.1, 12.2, 16.7, 9.4];

/**
 * Os planetas andam pelo céu.
 *
 * De dia eles giram em torno do Sol; de noite o Sol não está lá, e eles
 * continuam andando do mesmo jeito — que foi o pedido, e que também é o certo:
 * o que o Sol faz por eles não some quando a luz apaga. O que muda de noite é
 * só quem ilumina, não quem se move.
 *
 * O eixo é o da ilha, e não o do Sol, e isso é uma escolha de leitura: os
 * planetas estão a 50 e 90 daqui, o Sol a 110, e órbitas de verdade em torno
 * dele os levariam para trás da câmera na metade do caminho. Girando pelo eixo
 * da ilha eles ficam no céu que se vê, que é o único céu que existe aqui.
 */
export function orbitarPlanetas(ceu: THREE.Object3D, tempo: number) {
  const grupo = ceu.getObjectByName("planetas");
  if (!grupo) return;
  grupo.children.forEach((planeta, i) => {
    const periodo = PERIODOS[i % PERIODOS.length]!;
    planeta.rotation.y = 0;
    /* O planeta gira em torno do eixo Y da cena, então basta rodar a posição
       dele. `applyAxisAngle` a cada quadro acumularia erro; a conta sai da
       posição ORIGINAL, guardada na primeira passada. */
    const inicio = (planeta.userData.inicio ??= planeta.position.clone()) as THREE.Vector3;
    const a = (tempo * 2 * Math.PI) / (periodo * 60);
    const cos = Math.cos(a);
    const sen = Math.sin(a);
    planeta.position.set(
      inicio.x * cos - inicio.z * sen,
      inicio.y,
      inicio.x * sen + inicio.z * cos,
    );
  });
}

/** O céu inteiro roda devagar: é o Sol e a Lua atravessando. */
export function girarOCeu(ceu: THREE.Object3D, tempo: number) {
  ceu.rotation.y = tempo * VOLTA_DO_CEU;
}
