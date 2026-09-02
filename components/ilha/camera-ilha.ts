import * as THREE from "three";

import type { Ponto } from "@/components/ilha/pontos";

/**
 * Modo folha (celular): a câmera olha o objeto DE FORA da ilha.
 *
 * A regra anterior era a mesma do desktop com um recuo maior: mirar na cara do
 * objeto e afastar pela normal dele. Num celular isso não funciona, e os
 * números dizem por quê — a sala é pequena e a normal aponta para dentro dela.
 * Para enquadrar o monitor da esquerda a câmera precisava de 2,23 m e a busca
 * por espaço livre só achava 0,95, com um monitor de 0,75 m de altura: ele
 * ocupava 95% do quadro. E como em modo folha o alvo APAGA — senão o mesmo
 * texto aparece gigante atrás da folha —, o que sobrava acima do conteúdo era
 * uma parede preta. O mesmo no monitor da direita (0,95 de 2,23) e na TV
 * (1,39 de 2,03).
 *
 * Aqui a câmera sai do eixo do objeto e vai para a linha que liga o CENTRO DA
 * ILHA a ele, do lado de fora. Ali nunca há móvel entre os dois, então a busca
 * por espaço livre não tem o que cortar e o enquadramento sai o mesmo para as
 * seis paradas — que é o que faltava. O preço é honesto: no celular a parada
 * não é mais o objeto em close, é o canto da ilha onde ele mora.
 *
 * `QUADRO` é quanto de mundo cabe na LARGURA do quadro, em metros — e é a
 * largura, não a altura, porque celular é em pé: em 2,6 m de altura sobram
 * 1,20 m de largura, e o quadro de projetos tem 1,73 m. Ele aparecia cortado
 * dos dois lados, gigante, que é o defeito antigo de volta com outra roupa.
 * Em 2,2 m de largura o maior alvo cabe inteiro com folga.
 *
 * `TOPO` é onde a BORDA DE CIMA do objeto pousa na altura do quadro, e 0,24 a
 * põe ATRÁS da folha de propósito — a folha começa em 18%, e os 6% de margem
 * são para a sombra dela.
 *
 * A borda e não o centro: com o centro fixo, o quanto do objeto sobra acima da
 * folha depende do tamanho dele e da proporção da janela. Numa janela estreita
 * e alta a conta fechava, e num tablet de 900 por 896 — ainda modo folha, e o
 * cavalete tem 1,05 m — o topo dele subia para 16% e ele reaparecia por cima
 * da folha. Amarrando a borda, o alvo fica atrás em qualquer proporção e em
 * qualquer tamanho.
 *
 * A tentação é o contrário: pôr o alvo na faixa que sobra acima da folha, para
 * a parada querer dizer alguma coisa. Testado, e é o defeito antigo de volta —
 * a faixa tem 161 px num iPhone XR, e um alvo posto ali a preenche inteira. No
 * quadro de projetos dava para LER os post-its acima da folha, com o mesmo
 * texto embaixo. Não existe tamanho que sirva: grande o bastante para ser
 * reconhecido é grande o bastante para ser lido de novo.
 *
 * Com o alvo atrás da folha, a faixa mostra o que está ACIMA dele — a
 * lamparina, a estante, o domo, o céu. Isso é cenário, não conteúdo repetido,
 * e é a coisa certa a mostrar num pedaço de tela de 161 px. Quem fecha a folha
 * cai de frente para o objeto de verdade, pintado, sem precisar de zoom
 * nenhum: a viagem continua tendo destino.
 */
const QUADRO_MODO_FOLHA = 2.2;
const ELEVACAO_MODO_FOLHA = 0.26;
const TOPO_MODO_FOLHA = 0.24;

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
/**
 * O centro e o tamanho do objeto no mundo.
 *
 * Sai da caixa LOCAL da geometria passada pela matriz do mundo, e não da caixa
 * alinhada aos eixos: os monitores da mesa são girados, e a caixa alinhada
 * mediria a diagonal deles em vez da tela. A escala do mundo entra à mão
 * porque a caixa local a ignora, e um .glb chega escalado — a tela do monitor
 * mede 1,9 unidade no arquivo e 0,14 m na ilha.
 */
function medir(objeto: THREE.Object3D) {
  objeto.updateWorldMatrix(true, false);
  const geo = (objeto as { geometry?: { boundingBox: unknown; computeBoundingBox: () => void } })
    .geometry as { boundingBox: THREE.Box3 | null; computeBoundingBox: () => void } | undefined;
  if (!geo) return null;
  if (!geo.boundingBox) geo.computeBoundingBox();
  const caixa = geo.boundingBox;
  if (!caixa) return null;
  return {
    tamanho: caixa
      .getSize(new THREE.Vector3())
      .multiply(objeto.getWorldScale(new THREE.Vector3())),
    centro: caixa.getCenter(new THREE.Vector3()).applyMatrix4(objeto.matrixWorld),
  };
}

/**
 * Pose de chegada no celular. Ver o bloco de `QUADRO_MODO_FOLHA` no topo.
 */
export function poseFolha(
  objeto: THREE.Object3D,
  ponto: Ponto,
  fovGraus: number,
  aspecto: number,
): Pose | null {
  const medida = medir(objeto);
  if (!medida) return null;
  const { centro, tamanho } = medida;

  const fov = THREE.MathUtils.degToRad(fovGraus);
  const fovH = 2 * Math.atan(Math.tan(fov / 2) * aspecto);
  const distancia = QUADRO_MODO_FOLHA / 2 / Math.tan(fovH / 2);
  const alturaDoQuadro = 2 * distancia * Math.tan(fov / 2);

  /* A frente do objeto, achatada no plano horizontal — a mesma normal que o
     desktop usa, só que aqui ela dá a DIREÇÃO e não a distância.

     Pela frente e não pela linha que sai do centro da ilha: essa segunda saía
     mais barata (do lado de fora nunca há móvel no caminho) e mostrava as
     COSTAS de quem olha para dentro da sala. No quadro de projetos isso era
     uma chapa lisa de 1,73 m ocupando o quadro inteiro — trocar uma parede
     preta por uma parede cinza não conserta nada.

     O componente vertical da normal é descartado porque o cavalete é
     inclinado: seguir a normal dele levaria a câmera para o chão. */
  const frente = new THREE.Vector3(...ponto.frente)
    .applyQuaternion(objeto.getWorldQuaternion(new THREE.Quaternion()));
  frente.y = 0;
  if (frente.lengthSq() < 1e-6) frente.set(centro.x, 0, centro.z);
  if (frente.lengthSq() < 1e-6) frente.set(0, 0, 1);
  frente.normalize();

  /* Elevada, e é isso que faz a frente ser possível. Olhar de frente um quadro
     encostado na borda da ilha põe a câmera do outro lado da sala, onde há
     sofá, estante e mesa. A 25° de altura ela passa POR CIMA de tudo e a busca
     por espaço livre não tem o que cortar — que era a causa do enquadramento
     diferente em cada parada. */
  const horizontal = Math.cos(ELEVACAO_MODO_FOLHA) * distancia;
  const olho = new THREE.Vector3(
    centro.x + frente.x * horizontal,
    centro.y + Math.sin(ELEVACAO_MODO_FOLHA) * distancia,
    centro.z + frente.z * horizontal,
  );
  const foco = centro.clone();

  /* Descer a mira faz o objeto subir na imagem, e os dois pontos descem
     juntos: mexer só no foco giraria a câmera parada, como quem vira a
     cabeça, e o enquadramento lateral mudaria junto. */
  const descida = (0.5 - TOPO_MODO_FOLHA) * alturaDoQuadro - tamanho.y / 2;
  olho.y -= descida;
  foco.y -= descida;

  return { olho, foco };
}

export function poseDaTela(
  objeto: THREE.Object3D,
  ponto: Ponto,
  fovGraus: number,
  aspecto: number,
  /**
   * As caixas de todos os móveis, de `mapearObstaculos`. Sem isso a câmera do
   * quadro de projetos recua até parar dentro do abajur, e o visitante vê uma
   * mancha cinza gigante em vez do quadro.
   */
  obstaculos?: Obstaculo[],
): Pose | null {
  const medida = medir(objeto);
  if (!medida) return null;
  const { tamanho, centro } = medida;

  /* A normal local vira normal do mundo pela rotação do objeto. */
  const normal = new THREE.Vector3(...ponto.frente)
    .applyQuaternion(objeto.getWorldQuaternion(new THREE.Quaternion()))
    .normalize();

  const fov = THREE.MathUtils.degToRad(fovGraus);
  const porAltura = tamanho.y / 2 / Math.tan(fov / 2);
  const fovH = 2 * Math.atan(Math.tan(fov / 2) * aspecto);
  const larguraTela = Math.max(tamanho.x, tamanho.z);
  const porLargura = larguraTela / 2 / Math.tan(fovH / 2);

  /* A câmera recua até a tela inteira caber, na altura e na largura. Só o
     desktop passa por aqui: no celular quem enquadra é `poseFolha`. */
  const desejada = Math.max(porAltura, porLargura) * ponto.recuo;

  const distancia = obstaculos
    ? distanciaLivre(obstaculos, objeto.parent ?? objeto, centro, normal, desejada)
    : desejada;

  /* Descer a mira faz o objeto subir na imagem. A conta é a altura real do
     quadro naquela distância, senão o empurrão mudaria de tamanho conforme a
     tela do visitante. */
  const deslocamento = ponto.altura;

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
  /**
   * Para onde o visitante ARRASTOU a vista, em metros do mundo. Soma nos dois
   * pontos da pose, e é isso que o torna um passeio e não uma mira: mover só o
   * foco giraria a câmera parada, como quem vira a cabeça; mover os dois leva
   * a câmera junto, como quem anda de lado.
   */
  deslocamento?: THREE.Vector3,
): Pose {
  /* Coordenadas esféricas em volta do centro da ilha: o ângulo dá a volta e a
     elevação sobe e desce o olhar. É o mesmo par que o arrasto do ponteiro
     controla. */
  const horizontal = Math.cos(elevacao) * raio;
  const pose = {
    olho: new THREE.Vector3(
      Math.sin(angulo) * horizontal,
      alturaFoco + Math.sin(elevacao) * raio,
      Math.cos(angulo) * horizontal,
    ),
    foco: new THREE.Vector3(0, alturaFoco, 0),
  };
  if (deslocamento) {
    pose.olho.add(deslocamento);
    pose.foco.add(deslocamento);
  }
  return pose;
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
 * Se a peça aparece de verdade na tela.
 *
 * A ilha está cheia de peça escondida: todo móvel desenhado que um .glb
 * substituiu continua na cena, invisível, exatamente onde estava. E nem a
 * three nem a caixa envolvente olham `visible` — o raycaster acerta o que
 * ninguém vê, e o mapa de obstáculos desviava a câmera de coisa que não está
 * mais lá (foi o que empurrou a vista do "Sobre" para dentro da tela: ela
 * fugia do notebook desenhado, já trocado pelo MacBook).
 *
 * A checagem sobe pelos pais porque `visible` é bandeira local: a caneca some
 * pelo grupo `mug`, e as filhas dela seguem com `visible = true`.
 */
/**
 * Se a peça deve ficar de fora das medidas que varrem a ilha inteira.
 *
 * Nem tudo que está dentro do grupo `ilha` é a ilha para todos os efeitos. O
 * domo de vidro a envolve e a lamparina de teto pendura acima de tudo: as duas
 * são cenário, e entram em duas contas onde não deveriam.
 *
 * No ENQUADRAMENTO da vista geral, `alturaFoco` sai do topo da caixa — contar
 * com elas sobe a mira e encolhe a ilha no quadro.
 *
 * Nos OBSTÁCULOS da câmera é pior: a caixa do domo é a ilha inteira, então
 * toda pose de chegada acharia que a câmera está dentro de um móvel e puxaria
 * o enquadramento até colar na tela.
 *
 * A marca é `userData.foraDaMedida`, posta em `cena.ts`, e a busca sobe pelos
 * pais porque quem marca é o grupo, não cada malha. Marca e não lista de
 * nomes: quem cria a peça é quem sabe que ela é cenário, e assim não há uma
 * lista em outro arquivo para esquecer de atualizar.
 */
export function foraDaMedida(objeto: THREE.Object3D) {
  for (let no: THREE.Object3D | null = objeto; no; no = no.parent) {
    if (no.userData?.foraDaMedida) return true;
  }
  return false;
}

export function aparece(objeto: THREE.Object3D) {
  for (let no: THREE.Object3D | null = objeto; no; no = no.parent) {
    if (!no.visible) return false;
  }
  return true;
}

/**
 * A caixa de cada peça da ilha, no mundo.
 *
 * Vale a pena guardar: a ilha não se mexe, são 156 peças, e a busca por um
 * lugar livre para a câmera consulta todas elas várias vezes.
 */
export function mapearObstaculos(cena: THREE.Object3D): Obstaculo[] {
  cena.updateWorldMatrix(true, true);
  const lista: Obstaculo[] = [];

  cena.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh || !aparece(o) || foraDaMedida(o)) return;
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
