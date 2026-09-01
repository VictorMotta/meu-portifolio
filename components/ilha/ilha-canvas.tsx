"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import * as THREE from "three";

import {
  aparece,
  foraDaMedida,
  mapearObstaculos,
  poseDaTela,
  poseGeral,
  suavizar,
  type Pose,
} from "@/components/ilha/camera-ilha";
import { construirIlha, mostrarMobilia } from "@/components/ilha/cena";
import {
  ajustarCeu,
  ambienteDoCeu,
  direcaoDaLuz,
  construirCeu,
  descartarCeu,
  refletirNoFerro,
} from "@/components/ilha/ceu";
import {
  LIMIAR_DE_CLIQUE,
  ORBITA_INICIAL,
  limitarOrbita,
  pontoDoObjeto,
  type Orbita,
} from "@/components/ilha/controles";
import { PONTOS, type ChavePonto } from "@/components/ilha/pontos";
import { ENCAIXES, ESCONDIDOS, SUBSTITUIDAS, encaixarModelos, esconder } from "@/components/ilha/modelos";
import {
  acenderLamparinas,
  acesasPeloTema,
  aLamparinaDe,
  type Lamparina,
} from "@/components/ilha/luzes";
import { girarOCeu, orbitarPedras, orbitarPlanetas } from "@/components/ilha/orbitas";
import { arrumar, derrubar, integrar, oQueCai, type Caido } from "@/components/ilha/queda";
import { DURACAO_DA_TRANSICAO } from "@/lib/preferencia-ilha";
import { apagarTela, aplicarTexturas } from "@/components/ilha/texturas";
import type { Dictionary } from "@/content/i18n";
import type { Locale } from "@/content/site";
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
  locale: Locale;
  projetos: Project[];
  nomeDoMod: string;
  nome: string;
  reduzido: boolean;
  /** Modo folha: o painel cobre a parte de baixo, então a tela sobe no quadro. */
  folha: boolean;
  /** Tema escuro: é o que acende as duas lamparinas. Ver `luzes.ts`. */
  escuro: boolean;
  /**
   * A ilha está indo embora: a câmera se afasta até virar ponto, e só então o
   * modo troca. É a primeira metade do zoom que termina no fundo da página
   * rolável — ver `anunciarTransicao`, em `preferencia-ilha.ts`.
   */
  saindo: boolean;
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
  locale,
  projetos,
  nomeDoMod,
  nome,
  reduzido,
  folha,
  escuro,
  saindo,
  refPalco,
}: PropsCena) {
  const ilha = useMemo(() => construirIlha(), []);
  /* O céu é irmão da ilha, não filho. Ver o cabeçalho de `ceu.ts`: as três
     medidas que varrem a ilha inteira (enquadramento, obstáculos da câmera e
     chão da física) engoliriam uma esfera de 115 de raio. */
  const ceu = useMemo(() => construirCeu(), []);

  useEffect(() => () => descartarCeu(ceu), [ceu]);
  const { camera, gl, size, invalidate } = useThree();
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

     A pintura acontece já, antes dos modelos, e é refeita quando eles chegam:
     ela é barata e não depende de download. O que a pintura cria precisa ser
     descartado quando a ilha sair — material e textura vivem na placa de
     vídeo, e o coletor do JavaScript não alcança nenhum dos dois.

     Mas a MOBÍLIA desenhada não aparece mais nesse meio-tempo. Ela existia
     como o que se via enquanto os 50 MB desciam, e o raciocínio era "melhor
     algo do que nada". O algo, porém, é uma sala de blocos quadriculados: numa
     internet lenta ela fica na tela tempo bastante para ser a primeira
     impressão do portfólio. Agora entra escondida e é revelada de uma vez, com
     os modelos — a ilha vazia sob o domo já é uma imagem acabada, e vazio é
     melhor que feio. Ver `mostrarMobilia`. */
  const [modelosProntos, setModelosProntos] = useState(0);

  useEffect(() => {
    let vivo = true;
    mostrarMobilia(ilha, false);
    let lixoTexturas = aplicarTexturas(ilha, dict, locale, projetos, nome);
    let lixoModelos: { dispose: () => void }[] = [];
    /* As peças que só saem não dependem de download: somem no primeiro
       quadro, sem piscar na tela enquanto os .glb chegam.

       Junto com elas saem TODAS as que algum modelo cobre, e saem AGORA, e
       não quando o modelo chega. É a diferença entre uma falha silenciosa e
       uma sala de blocos: `encaixarModelo` engole o erro de cada arquivo para
       que um download quebrado não derrube os outros trinta e um, então um
       .glb que não desce simplesmente não escondia o móvel desenhado dele — e
       a mobília de caixas voltava para a tela, agora ao lado dos modelos que
       deram certo. Escondendo antes, o pior caso é um vão vazio, que é a
       mesma regra do resto da ilha: vazio é melhor que feio. */
    const lixoEscondidos = esconder(ilha, [...ESCONDIDOS, ...SUBSTITUIDAS]);
    invalidate();

    encaixarModelos(ilha, ENCAIXES).then((novo) => {
      if (!vivo) {
        for (const item of novo) item.dispose();
        return;
      }
      lixoModelos = novo;
      for (const item of lixoTexturas) item.dispose();
      lixoTexturas = aplicarTexturas(ilha, dict, locale, projetos, nome);
      /* Tudo de uma vez, e só agora. Revelar peça por peça conforme cada
         arquivo chega faria a sala se montar aos pulos na frente do
         visitante. */
      mostrarMobilia(ilha, true, SUBSTITUIDAS);
      setObstaculos(mapearObstaculos(ilha));
      setModelosProntos((n) => n + 1);
      invalidate();
    });

    return () => {
      vivo = false;
      for (const item of lixoTexturas) item.dispose();
      for (const item of lixoModelos) item.dispose();
      for (const item of lixoEscondidos) item.dispose();
      /* Devolve a mobília: o grupo `ilha` sobrevive ao efeito (vem de um
         `useMemo`), e deixá-lo escondido faria a próxima montagem começar com
         a sala apagada e nunca mais acender. */
      mostrarMobilia(ilha, true, SUBSTITUIDAS);
    };
  }, [ilha, dict, locale, projetos, nomeDoMod, nome, invalidate]);

  /* Quais lamparinas estão acesas AGORA — e para qual tema esse estado foi
     montado.

     O tema dá o ponto de partida (de noite acesas, de dia apagadas) e o
     visitante manda a partir dali, clicando em cada uma. Guardar o tema junto
     é o que permite recomeçar quando ele muda: acender a luz do quarto é
     evento maior que o interruptor de um abajur, então a troca de tema
     devolve as duas ao padrão em vez de preservar a escolha anterior.

     O ajuste é em RENDER, e não num efeito: num efeito o quadro sairia uma vez
     com a lamparina no estado do tema antigo e só então corrigiria — que é o
     piscar que essa mesma ilha já teve com o céu. */
  const [luzes, setLuzes] = useState(() => ({
    tema: escuro,
    acesas: acesasPeloTema(escuro),
  }));
  if (luzes.tema !== escuro) {
    setLuzes({ tema: escuro, acesas: acesasPeloTema(escuro) });
  }

  const alternarLamparina = useCallback((qual: Lamparina) => {
    setLuzes((antes) => ({
      ...antes,
      acesas: { ...antes.acesas, [qual]: !antes.acesas[qual] },
    }));
  }, []);

  /* `modelosProntos` entra na lista só como relógio: a lamparina de teto só
     existe depois que o .glb chega, e o efeito precisa rodar de novo ali para
     apagá-la. Quem conta é o efeito acima, quando `encaixarModelos` resolve. */
  useEffect(() => {
    acenderLamparinas(ilha, luzes.acesas);
    invalidate();
  }, [ilha, luzes.acesas, modelosProntos, invalidate]);

  /* O céu troca junto: de noite estrelas cheias e a Lua; de dia o Sol e as
     mesmas estrelas atrás da claridade. Não depende dos modelos — ele é todo
     construído aqui, sem download. */
  useEffect(() => {
    ajustarCeu(ceu, escuro);
    invalidate();
  }, [ceu, escuro, invalidate]);

  /* O casco de ferro reflete o céu. Sem `scene.environment` o metal resolve
     para preto — ver `ambienteDoCeu`. A textura é gerada aqui e descartada na
     troca: ela vive na placa de vídeo, e trocar de tema sem soltar a anterior
     vazaria um mapa por clique no interruptor. */
  useEffect(() => {
    const ambiente = ambienteDoCeu(gl, escuro);
    const desfazer = refletirNoFerro(ilha, ambiente);
    invalidate();
    return () => {
      desfazer();
      ambiente?.dispose();
    };
  }, [gl, ilha, escuro, invalidate]);

  /* A altura do deck: é onde as coisas derrubadas param de cair. */
  const chao = useMemo(() => {
    const tampo = ilha.getObjectByName("island_top");
    if (!tampo) return 0;
    return new THREE.Box3().setFromObject(tampo).max.y;
  }, [ilha]);

  /* Enquadramento da vista geral. Não dá para usar a esfera envolvente da
     cena inteira: a ilha tem uma ponta de rocha comprida embaixo, e mirar no
     centro dela deixaria os móveis lá em cima, minúsculos. Então o alvo é a
     largura do deck e a altura fica na altura da mobília.

     Quem tem `userData.foraDaMedida` fica de fora: a lamparina de teto e o
     domo de vidro. Os dois ficam bem acima de tudo, e `alturaFoco` sai de
     `max.y` — contando com eles a mira sobe junto e a ilha inteira desce no
     quadro, com a rocha de baixo saindo cortada pela borda da janela. Quem
     enquadra a ilha é o deck e a mobília; a lamparina é o teto que a ilha não
     tem, e o domo é o vidro por cima dele. */
  const enquadramento = useMemo(() => {
    ilha.updateWorldMatrix(true, true);
    const caixa = new THREE.Box3();
    ilha.traverse((no) => {
      if (!(no as THREE.Mesh).isMesh || foraDaMedida(no)) return;
      caixa.expandByObject(no);
    });
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

  /* O afastamento da entrada e da saída, como fator do raio da órbita.
     Começa em 3,2 — a ilha entra de longe, continuando o mergulho que o fundo
     da página começou — e caminha para 1. Na saída ele volta a 3,2, e quando
     chega lá o modo troca. É por isso que ele multiplica o raio em vez de
     mexer no zoom da órbita: o zoom é do visitante, tem limites próprios, e
     misturar os dois faria a roda do mouse brigar com a animação. */
  const afastamento = useRef(3.2);
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

    /* Vale o primeiro acerto VISÍVEL. O raio da three não olha `visible`, e o
       clique morria nas peças escondidas: mirar no Sonic acertava a `box_2`
       que ele substituiu, e mirar nos livros da cômoda acertava a pilha de
       pastas. Ver `aparece`. */
    const primeiroAcerto = (evento: PointerEvent) => {
      normalizar(evento);
      raio.setFromCamera(ponteiro, camera);
      return raio.intersectObject(ilha, true).find((a) => aparece(a.object)) ?? null;
    }

    /* Os dedos em cima da tela, um por `pointerId`.
       No mouse nunca passa de um; no celular, dois é a pinça. Guardar todos e
       decidir pelo tamanho do mapa é o que evita um estado separado
       "estou pinçando" que sai de sincronia quando um dedo sai da tela sem
       avisar. */
    const dedos = new Map<number, { x: number; y: number }>();
    /* A distância entre os dois dedos no quadro anterior. `null` quando não há
       pinça em curso — e é o que faz o segundo dedo começar sem um salto de
       zoom no primeiro quadro. */
    let pincaAnterior: number | null = null;

    const distanciaEntreDedos = () => {
      const [a, b] = [...dedos.values()];
      if (!a || !b) return null;
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const aoDescer = (evento: PointerEvent) => {
      if (travado()) return;
      dedos.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
      tela.setPointerCapture(evento.pointerId);

      if (dedos.size >= 2) {
        /* O segundo dedo cancela o arrasto em curso: o gesto virou pinça, e
           continuar girando junto faria a ilha rodar enquanto se dá zoom. */
        arrastando = false;
        idDoPonteiro = null;
        pincaAnterior = distanciaEntreDedos();
        girandoSozinha.current = false;
        aoInteragir();
        return;
      }

      arrastando = true;
      idDoPonteiro = evento.pointerId;
      ultimoX = evento.clientX;
      ultimoY = evento.clientY;
      percorrido = 0;
      definirCursor("grabbing");
    }

    const aoMover = (evento: PointerEvent) => {
      if (dedos.has(evento.pointerId)) {
        dedos.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
      }

      /* Pinça: a razão entre a distância de agora e a do quadro anterior é
         quanto o zoom muda. Razão, e não diferença, porque afastar os dedos de
         100 para 200 px tem de dar o mesmo efeito que de 200 para 400 — é
         assim que a pinça se comporta em toda parte.

         O zoom da órbita é uma DISTÂNCIA da câmera, então ele anda ao
         contrário do gesto: afastar os dedos (razão > 1) aproxima a câmera. */
      if (dedos.size >= 2) {
        const agora = distanciaEntreDedos();
        if (agora !== null && pincaAnterior !== null && pincaAnterior > 0) {
          orbita.current = limitarOrbita({
            ...orbita.current,
            zoom: orbita.current.zoom * (pincaAnterior / agora),
          });
          invalidate();
        }
        pincaAnterior = agora;
        return;
      }

      if (!arrastando) {
        if (travado()) return;
        /* Sem arrasto, o ponteiro só muda o cursor: o visitante precisa ver
           que a tela do monitor e a caneca respondem ao clique. */
        const acerto = primeiroAcerto(evento);
        const alvo = acerto?.object ?? null;
        definirCursor(
          alvo && (pontoDoObjeto(alvo) || oQueCai(alvo) || aLamparinaDe(alvo))
            ? "pointer"
            : "grab",
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
      const eraPinca = dedos.size >= 2;
      dedos.delete(evento.pointerId);
      if (tela.hasPointerCapture(evento.pointerId)) {
        tela.releasePointerCapture(evento.pointerId);
      }
      /* Tirar um dedo da pinça NÃO devolve o arrasto ao dedo que ficou: o
         gesto seguinte teria de começar de um ponto que ninguém marcou, e a
         ilha daria um pulo. O que fica é uma pinça sem par, inerte, até a mão
         sair da tela. */
      if (eraPinca) {
        pincaAnterior = dedos.size >= 2 ? distanciaEntreDedos() : null;
        return;
      }

      if (!arrastando || evento.pointerId !== idDoPonteiro) return;
      arrastando = false;
      idDoPonteiro = null;
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
        derrubar(caidos.current, ilha, queCai, daCamera);
        /* O contador é o tamanho da lista, e a lista tem um registro por
           objeto: dois cliques na mesma coisa continuam sendo "1 para
           arrumar". */
        aoDerrubar(caidos.current.length);
        invalidate();
        return;
      }

      /* A lamparina antes da seção, e sem disputa: nenhuma das duas está em
         `MOVEL_PARA_PONTO`, então isto não rouba clique de móvel nenhum. */
      const lamparina = aLamparinaDe(acerto.object);
      if (lamparina) {
        alternarLamparina(lamparina);
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
  }, [camera, ilha, refPalco, aoEscolher, aoDerrubar, aoMudarCursor, aoInteragir, alternarLamparina, invalidate]);

  const vetorAux = useMemo(() => new THREE.Vector3(), []);

  useFrame((estado, delta) => {
    const dt = Math.min(delta, 0.05);

    /* O relógio do R3F, em segundos desde que a cena montou. As órbitas saem
       dele e não de um acumulador próprio: ver o cabeçalho de `orbitas.ts`.
       Chama-se `relogio` porque `tempo` já é o cronômetro do voo da câmera. */
    const relogio = estado.clock.elapsedTime;
    orbitarPedras(ilha, relogio);
    orbitarPlanetas(ceu, relogio);
    girarOCeu(ceu, relogio);

    integrar(caidos.current, obstaculos, chao, dt);

    /* Sem destino e sem ninguém tendo mexido, a ilha gira devagar sozinha.
       Depois do primeiro arrasto ela para: o visitante assumiu o controle. */
    if (destinoAtual.current === null && !reduzido && girandoSozinha.current) {
      orbita.current.angulo += dt * 0.06;
    }

    /* 4,6 por segundo é o mesmo ritmo do fundo da página: as duas metades do
       zoom precisam ter a mesma velocidade, senão a emenda aparece. */
    const alvoDoAfastamento = saindo ? 3.2 : 1;
    afastamento.current += (alvoDoAfastamento - afastamento.current) *
      (reduzido ? 1 : 1 - Math.exp(-(4600 / DURACAO_DA_TRANSICAO) * dt));

    const geral = poseGeral(
      raioBase * orbita.current.zoom * afastamento.current,
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
    /* Tela de computador e tela de fliperama apagam; quadro, lousa e papel
       não têm o que apagar. Sem o fliperama nesta conta sobrava uma tira da
       textura pintada em volta do painel — a mesma lista escrita duas vezes,
       em dois tamanhos, na mesma tela. */
    /* Em MODO FOLHA apaga sempre, qualquer que seja a superfície. Ali o painel
       não pousa em cima do alvo: ele vira uma folha ancorada embaixo, e o
       quadro fica atrás dele, ocupando a tela toda com o mesmo texto em
       tamanho gigante. O visitante lê a stack duas vezes, uma por cima da
       outra — é o que se vê nos prints de celular. Sem alvo pintado atrás, o
       fundo vira o móvel e só. */
    const deveApagar =
      pontoDoVoo !== null &&
      (folha ||
        pontoDoVoo.superficie === "tela" ||
        pontoDoVoo.superficie === "fliperama") &&
      t >= 0.8;

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
      {/* A luz de fora vem do lado do astro que está no céu: do Sol de dia, da
          Lua de noite. Ver `direcaoDaLuz`. A cor e a força é que trocam — luz
          de sol é quente e forte, luar é frio e fraco. Ele não apaga de noite
          porque é ele que mantém o portfólio legível; quem faz a atmosfera são
          as lamparinas de dentro, que acendem no escuro. */}
      <hemisphereLight
        args={[escuro ? 0x9fb3d9 : 0xffffff, escuro ? 0x20283a : 0xd8d2c4, escuro ? 0.75 : 1]}
      />
      <directionalLight
        position={direcaoDaLuz()}
        intensity={escuro ? 1.35 : 2.6}
        color={escuro ? 0xcdddff : 0xfff2dc}
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
      {/* Preenchimento do lado oposto ao astro, para o lado escuro dos móveis
          não virar silhueta. Fraco de propósito: passando disso ele apaga a
          direção que a luz principal acabou de ganhar. */}
      <directionalLight
        position={direcaoDaLuz().map((v) => -v) as [number, number, number]}
        intensity={escuro ? 0.22 : 0.5}
        color={escuro ? 0xbcd0ff : 0xfff4e6}
      />
      <primitive object={ceu} />
      <primitive object={ilha} />
      {/* Não há plano de sombra. Existia um, 60 x 60 em y=0, cinco metros
          abaixo do deck, e era ele que desenhava a mancha escura sob a ilha —
          invisível no tema escuro e gritante no claro. Ilha que flutua no
          espaço não tem chão em que projetar sombra: a mancha dizia que havia
          piso ali embaixo, e não há. As sombras que importam continuam: são as
          dos móveis sobre o deck, que vêm do `receiveShadow` das peças da
          própria ilha e não deste plano. */}
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
