"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { construirIlha } from "@/components/ilha/cena";
import {
  afastarFundo,
  ajustarEstrelas,
  ambienteDoCeu,
  construirEstrelas,
  construirSistemaSolar,
  encaixarIlhaNoSistema,
  moverSistema,
  PERTO_DA_ILHA,
  refletirNoFerro,
} from "@/components/ilha/ceu";
import { orbitarPedras } from "@/components/ilha/orbitas";
import { assinarTransicao, DURACAO_DA_TRANSICAO } from "@/lib/preferencia-ilha";

/**
 * O fundo da página rolável: a constelação, e a ilha passando por dentro dela.
 *
 * Antes aqui havia um mundo de voxels — casas, árvores, uma torre — por onde a
 * câmera viajava conforme a página rolava. Era um segundo mundo, sem relação
 * nenhuma com o primeiro: quem saía da ilha caía num vilarejo de cubos. Agora
 * é a MESMA ilha e o MESMO céu do modo 3D, só que de longe. O site passa a ter
 * um lugar só, visto de duas distâncias.
 *
 * A ilha entra sem os `.glb`: `construirIlha` devolve o casco, o deck e a
 * mobília desenhada, e os 13 MB de modelos são o que `encaixarModelos` põe
 * por cima — coisa que só o modo 3D faz. Daqui, com a ilha ocupando um palmo
 * da tela, a diferença não se vê, e o fundo de um site de texto não pode
 * custar treze megabytes.
 *
 * O conteúdo continua sendo HTML de verdade por cima. Um site em que o texto
 * vira geometria seria bonito e inútil.
 */

/**
 * O tamanho da ilha dentro do sistema.
 *
 * Fora de escala de propósito, e bem fora: no lugar certo ela seria um ponto
 * de meia dúzia de pixels. É um sistema solar de ilustração, não de
 * astronomia — o corpo de que a história trata é desenhado grande, como num
 * pôster de planetário onde a Terra nunca tem o tamanho que teria.
 */
const ESCALA_DA_ILHA = 0.96;

/**
 * Onde a câmera descansa, e para onde ela olha.
 *
 * A mira fica 14 à ESQUERDA do Sol, e não nele: assim o sistema inteiro cai na
 * metade direita da tela, longe da coluna de texto. E a altura de 45 contra 76
 * de afastamento dá uns 31° de inclinação — o bastante para as órbitas serem
 * elipses e se lerem como órbitas, sem virar uma vista de cima, que
 * transformaria o sistema num alvo de tiro.
 */
const DESCANSO = new THREE.Vector3(-14, 45, 76);
const MIRA = new THREE.Vector3(-14, 0, 0);

function Cena({ reduzido, escuro }: { reduzido: boolean; escuro: boolean }) {
  const ilha = useMemo(() => construirIlha(), []);
  const estrelas = useMemo(() => construirEstrelas(), []);
  const sistema = useMemo(() => construirSistemaSolar(escuro), [escuro]);

  /* A ilha entra na terceira órbita, no lugar da Terra. O sistema deixa a casa
     vazia porque ele não conhece a ilha; quem tem as duas é este componente. */
  useEffect(() => encaixarIlhaNoSistema(sistema, ilha, ESCALA_DA_ILHA), [sistema, ilha]);
  const { camera, gl, invalidate } = useThree();

  /* Alvo e valor atual: a câmera persegue o alvo com suavização, senão o
     movimento fica preso ao passo do scroll e treme. */
  const alvo = useRef(0);
  const atual = useRef(0);

  /* O afastamento da câmera. Começa PERTO, porque o visitante acabou de sair
     da ilha, e caminha até o repouso — é a segunda metade daquele zoom. Se
     ele estiver voltando para a ilha, o aviso inverte o alvo e a câmera
     mergulha de volta, que é a primeira metade do zoom de ida. */
  const afastamento = useRef(PERTO_DA_ILHA);
  const afastamentoAlvo = useRef(1);

  useEffect(() => assinarTransicao((para) => {
    afastamentoAlvo.current = para === "ilha" ? PERTO_DA_ILHA : 1;
  }), []);

  /* A ilha de ferro reflete o céu aqui também. Sem o mapa de ambiente o casco
     metálico resolve para preto e a ilha vira uma silhueta chapada — o mesmo
     problema, e a mesma solução, do modo 3D. */
  useEffect(() => {
    const ambiente = ambienteDoCeu(gl, escuro);
    const desfazer = refletirNoFerro(ilha, ambiente);
    invalidate();
    return () => {
      desfazer();
      ambiente?.dispose();
    };
  }, [gl, ilha, escuro, invalidate]);

  useEffect(() => {
    ajustarEstrelas(estrelas, escuro);
    invalidate();
  }, [estrelas, escuro, invalidate]);

  useEffect(() => {
    const aoRolar = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      alvo.current = total > 0 ? window.scrollY / total : 0;
    };
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    window.addEventListener("resize", aoRolar);
    return () => {
      window.removeEventListener("scroll", aoRolar);
      window.removeEventListener("resize", aoRolar);
    };
  }, []);

  useFrame((estado, delta) => {
    /* As pedras orbitam aqui também: é a mesma ilha, e vê-la parada no fundo
       depois de vê-la viva no modo 3D entregaria que são duas montagens. */
    orbitarPedras(ilha, estado.clock.elapsedTime);

    /* Sem movimento reduzido: interpolação exponencial, que é estável em
       qualquer taxa de quadros. Com movimento reduzido: corta seco. */
    atual.current = reduzido
      ? alvo.current
      : atual.current + (alvo.current - atual.current) * (1 - Math.exp(-5 * delta));

    moverSistema(sistema, estado.clock.elapsedTime, atual.current);

    /* A mesma interpolação exponencial do scroll, com o tempo escolhido para
       casar com `DURACAO_DA_TRANSICAO`: em `4,6 / segundo` a distância cai a
       4% do caminho que falta no fim dos 700 ms. */
    const passo = reduzido ? 1 : 1 - Math.exp(-(4600 / DURACAO_DA_TRANSICAO) * delta);
    afastamento.current += (afastamentoAlvo.current - afastamento.current) * passo;
    afastarFundo(camera, DESCANSO, MIRA, afastamento.current);
  });

  return (
    <>
      {/* A luz vem de cima e do lado, como no modo 3D. Sem sombra: o casco
          aqui é silhueta contra estrela, e um mapa de sombra para um fundo de
          página é custo sem imagem. */}
      <hemisphereLight
        args={[escuro ? 0x9fb3d9 : 0xffffff, escuro ? 0x20283a : 0xd8d2c4, escuro ? 0.7 : 1]}
      />
      <directionalLight
        position={[-6, 9, 5]}
        intensity={escuro ? 1.9 : 2.4}
        color={escuro ? 0xcdddff : 0xfff2dc}
      />
      <directionalLight position={[7, 2, -6]} intensity={escuro ? 0.25 : 0.5} />
      <primitive object={estrelas} />
      <primitive object={sistema} />
    </>
  );
}

export default function Mundo3D() {
  const reduzido =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const { resolvedTheme } = useTheme();
  const escuro = resolvedTheme !== "light";

  return (
    <Canvas
      /* Perspectiva, e não a ortográfica de antes: é a profundidade que faz a
         constelação ficar ATRÁS da ilha em vez de coladas no mesmo plano.
         O campo estreito de 34° e a distância de 26 são o "tirar o zoom" —
         a ilha fica pequena no canto e o céu ocupa o resto. */
      camera={{ fov: 34, position: [-14, 45, 76], near: 0.5, far: 600 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: "low-power" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Cena reduzido={reduzido} escuro={escuro} />
    </Canvas>
  );
}
