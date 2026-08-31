import * as THREE from "three";

import type { Ponto } from "@/components/ilha/pontos";

/**
 * No modo folha a tela ocupa cerca de 40% da altura do quadro (1 / 2,45) e
 * sobe 34% dele, para pousar na faixa que sobra acima da folha de conteúdo.
 */
const RECUO_MODO_FOLHA = 2.45;
const SUBIDA_MODO_FOLHA = 0.34;

/* Limites duros da distância: nem colada na tela, nem no meio do oceano. */
const DISTANCIA_MINIMA = 0.5;

/* De quanto em quanto a busca recua a câmera procurando um lugar livre. */
const PASSO_DA_BUSCA = 0.08;
/* O espaço que a câmera precisa em volta de si. Menos que isso e o móvel
   aparece cortado e enorme no canto do enquadramento; mais que isso e a
   câmera desiste do enquadramento bom em corredores estreitos, como o
   caminho entre a estante e o quadro de projetos. */
const ESPACO_DA_CAMERA = new THREE.Vector3(0.5, 0.5, 0.5);

/** Onde a câmera está e para onde ela olha. */
export type Pose = { olho: THREE.Vector3; foco: THREE.Vector3 };

/**
 * Calcula a pose que enquadra uma tela da ilha de frente.
 *
 * A ideia é simples: pega o centro da tela no mundo, pega a normal da face
 * visível (girada pela matriz do objeto, então funciona com o grupo em
 * qualquer ângulo) e recua a câmera por essa normal. A distância sai da altura
 * real da tela e do campo de visão, de modo que a tela sempre ocupa a mesma
 * fatia do enquadramento, seja o monitor de 26cm ou o quadro de 1,15m.
 */
export function poseDaTela(
  objeto: THREE.Object3D,
  ponto: Ponto,
  fovGraus: number,
  aspecto: number,
  /**
   * Modo folha (celular): a folha de conteúdo cobre a parte de baixo da tela,
   * então a mira muda de regra — ver abaixo.
   */
  folha = false,
  /**
   * As caixas de todos os móveis, de `mapearObstaculos`. Sem isso a câmera do
   * quadro de projetos recua até parar dentro do abajur, e o visitante vê uma
   * mancha cinza gigante em vez do quadro.
   */
  obstaculos?: Obstaculo[],
): Pose | null {
  objeto.updateWorldMatrix(true, false);

  /* A medida sai da caixa local da geometria, não da caixa alinhada aos eixos
     do mundo: os monitores da mesa são girados, e a caixa do mundo mediria a
     diagonal deles em vez da tela. */
  const geo = (objeto as { geometry?: { boundingBox: unknown; computeBoundingBox: () => void } })
    .geometry as { boundingBox: THREE.Box3 | null; computeBoundingBox: () => void } | undefined;
  if (!geo) return null;
  if (!geo.boundingBox) geo.computeBoundingBox();
  const caixa = geo.boundingBox;
  if (!caixa) return null;

  /* A caixa local ignora a escala do objeto, e um modelo .glb chega escalado:
     a tela do monitor ultrawide mede 1,9 unidade no arquivo e 0,14 m na ilha.
     Sem multiplicar pela escala do mundo, a câmera recua para enquadrar a
     medida do arquivo e para longe demais para ver qualquer coisa. Nas peças
     desenhadas a escala é 1 e nada muda. */
  const tamanho = caixa
    .getSize(new THREE.Vector3())
    .multiply(objeto.getWorldScale(new THREE.Vector3()));
  const centro = caixa.getCenter(new THREE.Vector3()).applyMatrix4(objeto.matrixWorld);

  /* A normal local vira normal do mundo pela rotação do objeto. */
  const normal = new THREE.Vector3(...ponto.frente)
    .applyQuaternion(objeto.getWorldQuaternion(new THREE.Quaternion()))
    .normalize();

  const fov = THREE.MathUtils.degToRad(fovGraus);
  const porAltura = tamanho.y / 2 / Math.tan(fov / 2);
  const fovH = 2 * Math.atan(Math.tan(fov / 2) * aspecto);
  const larguraTela = Math.max(tamanho.x, tamanho.z);
  const porLargura = larguraTela / 2 / Math.tan(fovH / 2);

  /* Em tela larga a câmera recua até a tela inteira caber, na altura e na
     largura. Em tela de celular essa conta manda a câmera para trás demais:
     enquadrar 1,36 m de TV num quadro estreito jogaria a câmera para fora da
     zona gamer, atrás da estante — e o visitante veria móvel, não TV. Aí a
     regra passa a ser só a altura, e a tela sai cortada nas laterais, que é o
     enquadramento de quem está de perto mesmo. */
  const desejada = folha
    ? porAltura * RECUO_MODO_FOLHA
    : Math.max(porAltura, porLargura) * ponto.recuo;

  const distancia = obstaculos
    ? distanciaLivre(obstaculos, objeto.parent ?? objeto, centro, normal, desejada)
    : desejada;

  /* Descer a mira faz o objeto subir na imagem. A conta é a altura real do
     quadro naquela distância, senão o empurrão mudaria de tamanho conforme a
     tela do visitante. */
  const alturaDoQuadro = 2 * distancia * Math.tan(fov / 2);
  const deslocamento =
    ponto.altura - (folha ? SUBIDA_MODO_FOLHA : 0) * alturaDoQuadro;

  const foco = centro.clone().add(new THREE.Vector3(0, deslocamento, 0));
  const olho = centro.clone().addScaledVector(normal, distancia);
  olho.y += deslocamento;

  return { olho, foco };
}

/**
 * Pose de descanso: a câmera dá uma volta lenta em torno da ilha inteira.
 * É o estado em que o visitante chega e para onde ele volta ao fechar um
 * painel.
 */
export function poseGeral(
  raio: number,
  alturaFoco: number,
  angulo: number,
  elevacao: number,
): Pose {
  /* Coordenadas esféricas em volta do centro da ilha: o ângulo dá a volta e a
     elevação sobe e desce o olhar. É o mesmo par que o arrasto do ponteiro
     controla. */
  const horizontal = Math.cos(elevacao) * raio;
  return {
    olho: new THREE.Vector3(
      Math.sin(angulo) * horizontal,
      alturaFoco + Math.sin(elevacao) * raio,
      Math.cos(angulo) * horizontal,
    ),
    foco: new THREE.Vector3(0, alturaFoco, 0),
  };
}

/**
 * Curva de suavização do voo. Começa e termina parada, com a maior parte da
 * velocidade no meio — é o que faz o movimento parecer de câmera e não de
 * planilha.
 */
export function suavizar(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}


export type Obstaculo = { objeto: THREE.Object3D; caixa: THREE.Box3 };

/**
 * A caixa de cada peça da ilha, no mundo.
 *
 * Vale a pena guardar: a ilha não se mexe, são 156 peças, e a busca por um
 * lugar livre para a câmera consulta todas elas várias vezes.
 */
export function mapearObstaculos(cena: THREE.Object3D): Obstaculo[] {
  cena.updateWorldMatrix(true, true);
  const lista: Obstaculo[] = [];

  /* Peça escondida não é obstáculo. Os móveis desenhados que um modelo .glb
     substitui continuam na cena, só que invisíveis — e enquanto contavam
     aqui, a câmera desviava de coisa que ninguém vê. Foi o que empurrou a
     vista do "Sobre" para dentro da tela: ela fugia do notebook desenhado,
     que já tinha sido trocado pelo MacBook e estava em outro lugar.

     `visible` é bandeira local, então não basta olhar a malha: a caneca some
     pelo grupo `mug`, e as filhas dela seguem com visible = true. */
  const aparece = (o: THREE.Object3D) => {
    for (let no: THREE.Object3D | null = o; no; no = no.parent) {
      if (!no.visible) return false;
    }
    return true;
  };

  cena.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh || !aparece(o)) return;
    lista.push({ objeto: o, caixa: new THREE.Box3().setFromObject(o) });
  });
  return lista;
}

/**
 * A maior distância, até a desejada, em que a câmera não fica dentro de um
 * móvel.
 *
 * Testar um raio do centro da tela não basta: no quadro de projetos o raio
 * passava dois centímetros abaixo da cúpula do abajur e não acusava nada,
 * enquanto a cúpula tomava metade da tela. Aqui o que se testa é o volume que
 * a câmera ocupa, contra a caixa de cada peça — é a mesma pergunta que o
 * visitante faz ao olhar, e não uma linha fina no meio dela.
 *
 * A busca vem de trás para frente e devolve o primeiro lugar livre, então o
 * enquadramento ideal só é sacrificado quando não há mesmo espaço.
 */
export function distanciaLivre(
  obstaculos: Obstaculo[],
  proprio: THREE.Object3D,
  centro: THREE.Vector3,
  normal: THREE.Vector3,
  desejada: number,
): number {
  /* O móvel olhado não conta: a moldura do quadro, a barra do cabeçalho e os
     post-its estão todos colados na tela. */
  const meus = new Set<THREE.Object3D>();
  proprio.traverse((o) => meus.add(o));

  const cubo = new THREE.Box3();
  const olho = new THREE.Vector3();

  for (let d = desejada; d >= DISTANCIA_MINIMA; d -= PASSO_DA_BUSCA) {
    olho.copy(centro).addScaledVector(normal, d);
    cubo.setFromCenterAndSize(olho, ESPACO_DA_CAMERA);

    let livre = true;
    for (const obstaculo of obstaculos) {
      if (meus.has(obstaculo.objeto)) continue;
      if (obstaculo.caixa.intersectsBox(cubo)) {
        livre = false;
        break;
      }
    }
    if (livre) return d;
  }
  return DISTANCIA_MINIMA;
}
