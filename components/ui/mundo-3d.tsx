"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import {
  LUGARES,
  PASSO_Z,
  montarMundo,
} from "@/components/ui/voxel-mundo";

/**
 * O mundo voxel que fica atrás do site inteiro.
 *
 * A câmera viaja pelo mundo conforme a página rola: cada seção é um lugar.
 * O conteúdo continua sendo HTML de verdade por cima, então o texto é
 * selecionável, indexável e legível por leitor de tela. Um site em que o
 * texto vira geometria 3D seria bonito e inútil.
 */

const TAMANHO = 0.94;

function Mundo({ reduzido }: { reduzido: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const voxels = useMemo(() => montarMundo(), []);
  const { camera } = useThree();

  /* Alvo e valor atual: a câmera persegue o alvo com suavização, senão o
     movimento fica preso ao passo do scroll e treme. */
  const alvo = useRef(0);
  const atual = useRef(0);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    voxels.forEach((v, i) => {
      m.setPosition(v.x, v.y, v.z);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.set(v.cor));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [voxels]);

  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const p = total > 0 ? window.scrollY / total : 0;
      alvo.current = p * (LUGARES - 1) * PASSO_Z;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useFrame((_, delta) => {
    /* Sem movimento reduzido: interpolação exponencial, que é estável em
       qualquer taxa de quadros. Com movimento reduzido: corta seco. */
    atual.current = reduzido
      ? alvo.current
      : atual.current + (alvo.current - atual.current) * (1 - Math.exp(-6 * delta));

    /* O alvo fica deslocado no X para o mundo cair na metade direita da tela,
       longe do texto, que ocupa a esquerda. */
    camera.position.set(24, 21, atual.current + 24);
    camera.lookAt(-9, 2, atual.current + 5);
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, voxels.length]}>
      <boxGeometry args={[TAMANHO, TAMANHO, TAMANHO]} />
      <meshLambertMaterial flatShading />
    </instancedMesh>
  );
}

export default function Mundo3D() {
  const reduzido =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <Canvas
      orthographic
      camera={{ position: [22, 20, 22], zoom: 15 }}
      dpr={[1, 1.75]}
      gl={{ antialias: false, powerPreference: "low-power" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <ambientLight intensity={1.7} />
      <directionalLight position={[10, 18, 8]} intensity={2.1} />
      <directionalLight position={[-10, 6, -8]} intensity={0.45} />
      <fogExp2 attach="fog" args={["#0a0a0b", 0.0085]} />
      <Mundo reduzido={reduzido} />
    </Canvas>
  );
}
