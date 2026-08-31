"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";

import {
  mapearObstaculos,
  poseDaTela,
  poseGeral,
  suavizar,
  type Pose,
} from "@/components/ilha/camera-ilha";
import { construirIlha } from "@/components/ilha/cena";
import {
  LIMIAR_DE_CLIQUE,
  ORBITA_INICIAL,
  limitarOrbita,
  pontoDoObjeto,
  type Orbita,
} from "@/components/ilha/controles";
import { PONTOS, type ChavePonto } from "@/components/ilha/pontos";
import { ENCAIXES, ESCONDIDOS, encaixarModelos, esconder } from "@/components/ilha/modelos";
import { arrumar, derrubar, integrar, oQueCai, type Caido } from "@/components/ilha/queda";
import { apagarTela, aplicarTexturas } from "@/components/ilha/texturas";
import type { Dictionary } from "@/content/i18n";
import type { Project } from "@/lib/projects";

const FOV = 45;
/* Duração do voo entre a vista geral e uma tela, em segundos. */
const DURACAO = 1.5;

export type Cursor = "grab" | "grabbing" | "pointer";

export type Quadro = {
  /** Retângulo da tela projetado na viewport, em pixels de CSS. */
  x: number;
  y: number;
  largura: number;
  altura: number;
  /** 0 na vista geral, 1 com a tela enquadrada. */
  progresso: number;
};

type PropsCena = {
  destino: ChavePonto | null;
  aoChegar: () => void;
  aoAtualizarQuadro: (q: Quadro) => void;
  /** Clique num móvel: leva à seção dele. */
  aoEscolher: (chave: ChavePonto) => void;
  /** Quantas coisas estão caídas, para a interface oferecer o "arrumar". */
  aoDerrubar: (quantidade: number) => void;
  /** Muda de valor quando a interface pede para arrumar a ilha. */
  pedidoDeArrumar: number;
  /** Que cursor o palco deve mostrar agora. */
  aoMudarCursor: (cursor: Cursor) => void;
  /** Chamado no primeiro gesto, para a dica de uso sair da tela. */
  aoInteragir: () => void;
  /** O que vai escrito nas telas e nos quadros da cena. */
  dict: Dictionary;
  projetos: Project[];
  nomeDoMod: string;
  nome: string;
  reduzido: boolean;
  /** Modo folha: o painel cobre a parte de baixo, então a tela sobe no quadro. */
  folha: boolean;
  /**
   * O elemento que embrulha o canvas. Os gestos moram nele, e não no canvas:
   * o canvas pertence ao renderizador, e mexer no estilo dele é mexer num
   * valor que veio de um hook.
   */
  refPalco: RefObject<HTMLDivElement | null>;
};

function Ilha({
  destino,
  aoChegar,
  aoAtualizarQuadro,
  aoEscolher,
  aoDerrubar,
  pedidoDeArrumar,
  aoMudarCursor,
  aoInteragir,
  dict,
  projetos,
  nomeDoMod,
  nome,
  reduzido,
  folha,
  refPalco,
}: PropsCena) {
  const ilha = useMemo(() => construirIlha(), []);
  const { camera, size, invalidate } = useThree();
  /* As caixas dos móveis, para a câmera não parar dentro de um deles.
     Refeitas quando os modelos entram: eles trocam móveis de lugar e escondem
     os desenhados, então o mapa da montagem descreve uma cena que deixou de
     existir. Era isso que empurrava a vista do "Sobre" para dentro da tela —
     a câmera desviava do notebook desenhado, que já tinha sido substituído
     pelo MacBook e estava em outro lugar. */
  const [obstaculos, setObstaculos] = useState(() => mapearObstaculos(ilha));

  /* A tela do móvel só apaga no fim do voo, não no clique.
     Apagar junto com o clique entregava o truque: a tela piscava para preta e
     só então a câmera começava a andar. Agora ela fica acesa durante todo o
     zoom — o visitante vê o próprio conteúdo se aproximando — e some quando o
     painel já está por cima, cobrindo a troca.

     Mora no laço de quadro, e não num efeito, porque o gatilho é o progresso
     do voo, que só existe lá. O `ref` guarda como acender de volta. */
  const apagada = useRef<{ material: THREE.Material | THREE.Material[] | undefined; acender: () => void } | null>(null);
  useEffect(() => () => {
    apagada.current?.acender();
    apagada.current = null;
  }, []);

  /* O texto das telas é pintado depois de montar a cena, e o que a pintura
     cria precisa ser descartado quando a ilha sair: material e textura vivem
     na placa de vídeo, e o coletor do JavaScript não alcança nenhum dos dois. */
  /* Texto das telas e modelos .glb no mesmo efeito, porque a ordem entre eles
     importa: o monitor do modelo herda o nome `monitor_left_screen`, e é esse
     nome que a pintura procura. Pintar uma vez só, antes, escreveria na caixa
     que vai ser escondida.

     Mesmo assim a primeira pintura acontece já: são 13 MB de modelo, e
     esperar o download para escrever nas telas deixaria a ilha muda por
     segundos. Quando os arquivos chegam, a pintura é refeita sobre as telas
     novas. O que a pintura cria precisa ser descartado quando a ilha sair:
     material e textura vivem na placa de vídeo, e o coletor do JavaScript não
     alcança nenhum dos dois. */
  useEffect(() => {
    let vivo = true;
    let lixoTexturas = aplicarTexturas(ilha, dict, projetos, nome);
    let lixoModelos: { dispose: () => void }[] = [];
    /* As peças que só saem não dependem de download: somem no primeiro
       quadro, sem piscar na tela enquanto os .glb chegam. */
    const lixoEscondidos = esconder(ilha, ESCONDIDOS);
    invalidate();

    encaixarModelos(ilha, ENCAIXES).then((novo) => {
      if (!vivo) {
        for (const item of novo) item.dispose();
        return;
      }
      lixoModelos = novo;
      for (const item of lixoTexturas) item.dispose();
      lixoTexturas = aplicarTexturas(ilha, dict, projetos, nome);
      setObstaculos(mapearObstaculos(ilha));
      invalidate();
    });

    return () => {
      vivo = false;
      for (const item of lixoTexturas) item.dispose();
      for (const item of lixoModelos) item.dispose();
      for (const item of lixoEscondidos) item.dispose();
    };
  }, [ilha, dict, projetos, nomeDoMod, nome, invalidate]);


  /* A altura do deck: é onde as coisas derrubadas param de cair. */
  const chao = useMemo(() => {
    const tampo = ilha.getObjectByName("island_top");
    if (!tampo) return 0;
    return new THREE.Box3().setFromObject(tampo).max.y;
  }, [ilha]);

  /* Enquadramento da vista geral. Não dá para usar a esfera envolvente da
     cena inteira: a ilha tem uma ponta de rocha comprida embaixo, e mirar no
     centro dela deixaria os móveis lá em cima, minúsculos. Então o alvo é a
     largura do deck e a altura fica na altura da mobília. */
  const enquadramento = useMemo(() => {
    const caixa = new THREE.Box3().setFromObject(ilha);
    const tamanho = caixa.getSize(new THREE.Vector3());
    return {
      meiaLargura: Math.max(tamanho.x, tamanho.z) / 2,
      fov: THREE.MathUtils.degToRad(FOV),
      alturaFoco: caixa.max.y - tamanho.y * 0.3,
    };
  }, [ilha]);

  /* A distância depende do formato da janela: em tela estreita a ilha
     precisa de mais recuo para não sair pelas laterais. */
  const raioBase = useMemo(() => {
    const aspecto = size.width / size.height;
    const fovH = 2 * Math.atan(Math.tan(enquadramento.fov / 2) * aspecto);
    const porLargura = enquadramento.meiaLargura / Math.tan(fovH / 2);
    const porAltura = enquadramento.meiaLargura / Math.tan(enquadramento.fov / 2);
    return Math.min(porLargura, porAltura * 1.6) * 1.34;
  }, [enquadramento, size.width, size.height]);

  /* Estado do voo e da órbita. Fica em refs porque muda a cada quadro: passar
     isso por estado do React redesenharia a árvore 60 vezes por segundo. */
  const orbita = useRef<Orbita>({ ...ORBITA_INICIAL });
  const girandoSozinha = useRef(true);
  const partida = useRef<Pose | null>(null);
  const chegada = useRef<Pose | null>(null);
  const tempo = useRef(1);
  const destinoAtual = useRef<ChavePonto | null>(null);
  const avisou = useRef(true);
  const alvoMesh = useRef<THREE.Object3D | null>(null);

  const olhoAtual = useRef(new THREE.Vector3());
  const focoAtual = useRef(new THREE.Vector3());

  const caidos = useRef<Caido[]>([]);

  useEffect(() => {
    const geral = poseGeral(
      raioBase,
      enquadramento.alturaFoco,
      orbita.current.angulo,
      orbita.current.elevacao,
    );
    olhoAtual.current.copy(geral.olho);
    focoAtual.current.copy(geral.foco);
    camera.position.copy(geral.olho);
    camera.lookAt(geral.foco);
    invalidate();
  }, [camera, enquadramento, raioBase, invalidate]);

  /* Troca de destino: guarda de onde saiu e para onde vai, e zera o relógio.
     A pose de chegada é resolvida aqui, uma vez — a busca por espaço livre
     varre as caixas de todos os móveis, e a ilha não se mexe. */
  useEffect(() => {
    if (destino === destinoAtual.current) return;
    destinoAtual.current = destino;
    avisou.current = false;
    partida.current = {
      olho: olhoAtual.current.clone(),
      foco: focoAtual.current.clone(),
    };

    if (destino === null) {
      alvoMesh.current = null;
      chegada.current = null;
    } else {
      const ponto = PONTOS[destino];
      const mesh = ilha.getObjectByName(ponto.alvo) ?? null;
      alvoMesh.current = mesh;
      chegada.current = mesh
        ? poseDaTela(mesh, ponto, FOV, size.width / size.height, folha, obstaculos)
        : null;
    }

    tempo.current = reduzido ? DURACAO : 0;
    invalidate();
  }, [destino, ilha, obstaculos, size.width, size.height, reduzido, folha, invalidate]);

  /* Arrumar a ilha: cada coisa derrubada volta para o móvel de onde saiu. */
  useEffect(() => {
    if (pedidoDeArrumar === 0) return;
    arrumar(caidos.current);
    caidos.current = [];
    aoDerrubar(0);
    invalidate();
  }, [pedidoDeArrumar, aoDerrubar, invalidate]);

  /* Ponteiro: arrastar gira a ilha, a roda aproxima, e um toque sem arrasto é
     um clique — que abre a seção do móvel ou derruba o objeto. */
  useEffect(() => {
    const tela = refPalco.current;
    if (!tela) return;
    const raio = new THREE.Raycaster();
    const ponteiro = new THREE.Vector2();

    /* O cursor é estado da interface, não do renderizador: mexer no estilo do
       canvas seria mexer num objeto que veio de um hook, e o compilador do
       React barra isso — com razão, porque quebra em re-render. */
    let cursorAtual = "";
    const definirCursor = (c: Cursor) => {
      if (c === cursorAtual) return;
      cursorAtual = c;
      aoMudarCursor(c);
    };

    let arrastando = false;
    let idDoPonteiro: number | null = null;
    let ultimoX = 0;
    let ultimoY = 0;
    let percorrido = 0;

    /* A seção aberta trava a câmera na tela: girar a ilha no meio da leitura
       tiraria o painel do lugar em que ele pousou. */
    const travado = () => destinoAtual.current !== null;

    const normalizar = (evento: PointerEvent | WheelEvent) => {
      const r = tela.getBoundingClientRect();
      ponteiro.x = ((evento.clientX - r.left) / r.width) * 2 - 1;
      ponteiro.y = -((evento.clientY - r.top) / r.height) * 2 + 1;
    }

    const primeiroAcerto = (evento: PointerEvent) => {
      normalizar(evento);
      raio.setFromCamera(ponteiro, camera);
      return raio.intersectObject(ilha, true)[0] ?? null;
    }

    const aoDescer = (evento: PointerEvent) => {
      if (travado()) return;
      arrastando = true;
      idDoPonteiro = evento.pointerId;
      ultimoX = evento.clientX;
      ultimoY = evento.clientY;
      percorrido = 0;
      tela.setPointerCapture(evento.pointerId);
      definirCursor("grabbing");
    }

    const aoMover = (evento: PointerEvent) => {
      if (!arrastando) {
        if (travado()) return;
        /* Sem arrasto, o ponteiro só muda o cursor: o visitante precisa ver
           que a tela do monitor e a caneca respondem ao clique. */
        const acerto = primeiroAcerto(evento);
        const alvo = acerto?.object ?? null;
        definirCursor(
          alvo && (pontoDoObjeto(alvo) || oQueCai(alvo)) ? "pointer" : "grab",
        );
        return;
      }
      if (evento.pointerId !== idDoPonteiro) return;

      const dx = evento.clientX - ultimoX;
      const dy = evento.clientY - ultimoY;
      ultimoX = evento.clientX;
      ultimoY = evento.clientY;
      percorrido += Math.abs(dx) + Math.abs(dy);
      if (percorrido < LIMIAR_DE_CLIQUE) return;

      girandoSozinha.current = false;
      aoInteragir();
      orbita.current = limitarOrbita({
        angulo: orbita.current.angulo - dx * 0.005,
        elevacao: orbita.current.elevacao + dy * 0.004,
        zoom: orbita.current.zoom,
      });
      invalidate();
    }

    const aoSubir = (evento: PointerEvent) => {
      if (!arrastando || evento.pointerId !== idDoPonteiro) return;
      arrastando = false;
      idDoPonteiro = null;
      if (tela.hasPointerCapture(evento.pointerId)) {
        tela.releasePointerCapture(evento.pointerId);
      }
      definirCursor("grab");
      if (percorrido >= LIMIAR_DE_CLIQUE || travado()) return;

      const acerto = primeiroAcerto(evento);
      if (!acerto) return;

      /* Coisa solta tem prioridade sobre o móvel em que ela está apoiada:
         clicar na caneca derruba a caneca, não abre o Sobre da mesa. */
      aoInteragir();

      const queCai = oQueCai(acerto.object);
      if (queCai) {
        const daCamera = acerto.point.clone().sub(camera.position);
        caidos.current.push(derrubar(ilha, queCai, daCamera));
        aoDerrubar(caidos.current.length);
        invalidate();
        return;
      }

      const chave = pontoDoObjeto(acerto.object);
      if (chave) aoEscolher(chave);
    }

    const aoRolar = (evento: WheelEvent) => {
      if (travado()) return;
      evento.preventDefault();
      girandoSozinha.current = false;
      aoInteragir();
      orbita.current = limitarOrbita({
        ...orbita.current,
        zoom: orbita.current.zoom * (1 + evento.deltaY * 0.0012),
      });
      invalidate();
    }

    definirCursor("grab");
    tela.addEventListener("pointerdown", aoDescer);
    tela.addEventListener("pointermove", aoMover);
    tela.addEventListener("pointerup", aoSubir);
    tela.addEventListener("pointercancel", aoSubir);
    tela.addEventListener("wheel", aoRolar, { passive: false });
    return () => {
      tela.removeEventListener("pointerdown", aoDescer);
      tela.removeEventListener("pointermove", aoMover);
      tela.removeEventListener("pointerup", aoSubir);
      tela.removeEventListener("pointercancel", aoSubir);
      tela.removeEventListener("wheel", aoRolar);
    };
  }, [camera, ilha, refPalco, aoEscolher, aoDerrubar, aoMudarCursor, aoInteragir, invalidate]);

  const vetorAux = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    integrar(caidos.current, obstaculos, chao, dt);

    /* Sem destino e sem ninguém tendo mexido, a ilha gira devagar sozinha.
       Depois do primeiro arrasto ela para: o visitante assumiu o controle. */
    if (destinoAtual.current === null && !reduzido && girandoSozinha.current) {
      orbita.current.angulo += dt * 0.06;
    }

    const geral = poseGeral(
      raioBase * orbita.current.zoom,
      enquadramento.alturaFoco,
      orbita.current.angulo,
      orbita.current.elevacao,
    );

    /* A pose de chegada já vem resolvida do efeito acima. */
    const destinoPose = chegada.current ?? geral;

    tempo.current = Math.min(tempo.current + dt, DURACAO);
    const bruto = tempo.current / DURACAO;
    const t = suavizar(bruto);

    const origem = partida.current ?? geral;
    olhoAtual.current.lerpVectors(origem.olho, destinoPose.olho, t);
    focoAtual.current.lerpVectors(origem.foco, destinoPose.foco, t);

    camera.position.copy(olhoAtual.current);
    camera.lookAt(focoAtual.current);
    camera.updateMatrixWorld();

    if (!avisou.current && bruto >= 1) {
      avisou.current = true;
      aoChegar();
    }

    /* 0,8 do voo: o painel começa a aparecer em 0,62 e chega a ~47% de opaco
       aqui, então a tela apagando por baixo já está coberta e não pisca. Na
       volta acende na hora, e a tela se reacende enquanto a câmera recua. */
    const pontoDoVoo = destinoAtual.current ? PONTOS[destinoAtual.current] : null;
    const deveApagar =
      pontoDoVoo !== null && pontoDoVoo.superficie === "tela" && t >= 0.8;

    /* O controle é pelo MATERIAL, não pelo nome do móvel. A pintura das
       texturas troca o material do alvo por um novo — e trocou de verdade,
       três vezes, inclusive depois da chegada: a tela apagava e reacendia
       sozinha. Comparando a identidade do material, qualquer troca é
       percebida no quadro seguinte e a tela apaga de novo. */
    const malhaDoVoo = deveApagar
      ? (ilha.getObjectByName(pontoDoVoo!.alvo) as THREE.Mesh | undefined)
      : undefined;

    if (deveApagar && apagada.current?.material !== malhaDoVoo?.material) {
      apagada.current?.acender();
      apagada.current = {
        material: malhaDoVoo?.material,
        acender: apagarTela(ilha, pontoDoVoo!.alvo),
      };
    } else if (!deveApagar && apagada.current) {
      apagada.current.acender();
      apagada.current = null;
    }

    /* Projeta a tela alvo na viewport, para o painel de HTML pousar
       exatamente em cima dela. */
    const mesh = alvoMesh.current;
    if (!mesh) {
      aoAtualizarQuadro({ x: 0, y: 0, largura: 0, altura: 0, progresso: 0 });
      return;
    }

    /* Projeta a caixa LOCAL do mesh passada pela matriz do mundo, não a
       caixa alinhada aos eixos do mundo: os monitores são girados, e a caixa
       alinhada seria bem maior que a tela de verdade. */
    const geo = (mesh as THREE.Mesh).geometry;
    if (!geo) {
      aoAtualizarQuadro({ x: 0, y: 0, largura: 0, altura: 0, progresso: 0 });
      return;
    }
    if (!geo.boundingBox) geo.computeBoundingBox();
    const local = geo.boundingBox;
    if (!local) {
      aoAtualizarQuadro({ x: 0, y: 0, largura: 0, altura: 0, progresso: 0 });
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < 8; i++) {
      vetorAux.set(
        i & 1 ? local.max.x : local.min.x,
        i & 2 ? local.max.y : local.min.y,
        i & 4 ? local.max.z : local.min.z,
      );
      vetorAux.applyMatrix4(mesh.matrixWorld);
      vetorAux.project(camera);
      const px = (vetorAux.x * 0.5 + 0.5) * size.width;
      const py = (-vetorAux.y * 0.5 + 0.5) * size.height;
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }

    aoAtualizarQuadro({
      x: minX,
      y: minY,
      largura: maxX - minX,
      altura: maxY - minY,
      progresso: destinoAtual.current === null ? 0 : t,
    });
  });

  return (
    <>
      <hemisphereLight args={[0xffffff, 0xd8d2c4, 1]} />
      <directionalLight
        position={[4, 7, 5]}
        intensity={2.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0002}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-far={30}
      />
      <directionalLight position={[-5, 3, -4]} intensity={0.5} color={0xfff4e6} />
      <primitive object={ilha} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <shadowMaterial opacity={0.18} />
      </mesh>
    </>
  );
}

export default function IlhaCanvas(props: PropsCena) {
  return (
    <Canvas
      dpr={[1, 2]}
      shadows
      /* ACES com exposição puxada para cima: as telas da ilha são emissivas e
         estouram sem tonemap, mas o ACES padrão do R3F escurece demais uma
         paleta que já é noturna. */
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.45,
      }}
      camera={{ fov: FOV, near: 0.01, far: 500, position: [3, 2.2, 4] }}
      /* A ilha gira sem parar na vista geral, então o laço roda sempre. Quem
         pediu menos movimento no sistema recebe a órbita parada — aí o custo
         cai para o mínimo. */
      frameloop="always"
    >
      <Ilha {...props} />
    </Canvas>
  );
}
