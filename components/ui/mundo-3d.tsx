"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { construirIlha, mostrarMobilia } from "@/components/ilha/cena";
import {
  encaixarModelos,
  ENCAIXES,
  ESCONDIDOS,
  SUBSTITUIDAS,
  esconder,
} from "@/components/ilha/modelos";
import { aplicarTexturas } from "@/components/ilha/texturas";
import type { Dictionary } from "@/content/i18n";
import { site, type Locale } from "@/content/site";
import type { Project } from "@/lib/projects";
import {
  ajustarEstrelas,
  ambienteDoCeu,
  construirEstrelas,
  construirSistemaSolar,
  encaixarIlhaNoSistema,
  ESTRELAS_NA_VIAGEM,
  moverSistema,
  PERTO_DA_ILHA,
  poseDoFundo,
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
 * mobília desenhada, e os 50 MB de modelos são o que `encaixarModelos` põe
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

type Conteudo = { dict: Dictionary; locale: Locale; projetos: Project[] };

function Cena({
  reduzido,
  escuro,
  conteudo,
}: {
  reduzido: boolean;
  escuro: boolean;
  conteudo: Conteudo;
}) {
  const ilha = useMemo(() => construirIlha(), []);
  const estrelas = useMemo(() => construirEstrelas(), []);
  const sistema = useMemo(() => construirSistemaSolar(escuro), [escuro]);
  const { camera, gl, invalidate } = useThree();

  /* Quantas vezes os modelos já chegaram. É `state` e não `ref` porque o
     efeito abaixo precisa rodar de novo quando o valor muda. */
  const [modelosProntos, setModelosProntos] = useState(false);

  /* A ilha entra na terceira órbita, no lugar da Terra, e entra VAZIA: o
     sistema deixa a casa vazia porque não conhece a ilha, e a mobília fica
     escondida enquanto ela for um ponto no sistema.

     O `sistema` é reconstruído a cada troca de tema (as cores das órbitas e do
     Sol saem dela), então este efeito roda de novo — e escondia a mobília que
     já tinha chegado, sem nunca mais devolvê-la, porque o pedido dos modelos
     só acontece uma vez. Trocar de claro para escuro esvaziava a ilha. Daí a
     condição: só esconde enquanto os modelos não chegaram. */
  useEffect(() => {
    mostrarMobilia(ilha, modelosProntos, SUBSTITUIDAS);
    return encaixarIlhaNoSistema(sistema, ilha, ESCALA_DA_ILHA);
  }, [sistema, ilha, modelosProntos]);

  /* Os modelos chegam SOB DEMANDA, quando a rolagem se aproxima do mergulho.
     São 50 MB: baixá-los no carregamento puniria quem abre a página só para
     ler, que é o caso mais comum e a razão de a ilha ser opcional. Mas de
     perto, no fim da página, o casco vazio não se sustenta — é ali que a
     mobília precisa existir.

     O pedido sai em 0,25 e o mergulho só começa em 0,45: é um quarto de página
     de dianteira para os arquivos chegarem antes de a câmera colar na ilha. E
     a mobília só aparece quando TODOS terminam, pelo mesmo motivo do modo 3D —
     montar aos pulos na frente de quem olha é pior que esperar. */
  const pedindoModelos = useRef(false);
  const pedirModelos = useCallback(() => {
    if (pedindoModelos.current) return;
    pedindoModelos.current = true;
    /* Junto com as peças que só saem, saem TODAS as que algum modelo cobre —
       e saem AGORA, não quando o modelo chega. `encaixarModelo` engole o erro
       de cada arquivo para que um download quebrado não derrube os outros
       trinta e um; o preço é que um .glb que não desce não escondia o móvel
       desenhado dele, e a mobília de caixas voltava para a tela ao lado dos
       modelos que deram certo. Escondendo antes, o pior caso é um vão vazio —
       a mesma regra do resto da ilha: vazio é melhor que feio. */
    esconder(ilha, [...ESCONDIDOS, ...SUBSTITUIDAS]);
    encaixarModelos(ilha, ENCAIXES).then(() => {
      /* A MESMA pintura do modo 3D. Sem ela as chapas ficam com o material
         cru — retângulos claros colados nos quadros e nos monitores, que de
         longe parecem telas quebradas. É a ilha inteira ou nenhuma: meia ilha
         é pior que ilha vazia.

         Depois dos modelos, e não antes: `encostarNoQuadro` mede a face do
         `.glb` para encaixar a chapa nela, e antes do download não há face. */
      aplicarTexturas(
        ilha,
        conteudo.dict,
        conteudo.locale,
        conteudo.projetos,
        site.name,
      );
      setModelosProntos(true);
      invalidate();
    });
  }, [ilha, invalidate, conteudo]);

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

  useEffect(
    () =>
      assinarTransicao((para) => {
        afastamentoAlvo.current = para === "ilha" ? PERTO_DA_ILHA : 1;
      }),
    [],
  );

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

  /* Quanto o visitante está "na outra galáxia": 1 com a seção de Stack no meio
     da tela, 0 longe dela. Medido do DOM a cada rolagem, e não numa fração
     fixa da página: as seções mudam de altura com a largura da janela e com o
     idioma, e um número escrito à mão aqui descolaria da seção no primeiro
     parágrafo que crescesse. */
  const viagem = useRef(0);
  const viagemAlvo = useRef(0);

  useEffect(() => {
    const aoRolar = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      alvo.current = total > 0 ? window.scrollY / total : 0;
      if (alvo.current > 0.25) pedirModelos();

      const stack = document.getElementById("stack");
      if (!stack) return;
      const caixa = stack.getBoundingClientRect();
      /* Distância entre o meio da seção e o meio da janela. */
      const desvio = Math.abs(
        caixa.top + caixa.height / 2 - window.innerHeight / 2,
      );
      /* Platô no miolo e rampa nas bordas, em vez de um pico só no centro
         exato: com pico, a galáxia começaria a voltar no mesmo instante em que
         terminasse de ir, e a viagem viraria um solavanco. */
      const dentro = caixa.height * 0.25;
      const fora = caixa.height / 2 + window.innerHeight * 0.3;
      viagemAlvo.current = Math.min(
        1,
        Math.max(0, (fora - desvio) / (fora - dentro)),
      );
    };
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    window.addEventListener("resize", aoRolar);
    return () => {
      window.removeEventListener("scroll", aoRolar);
      window.removeEventListener("resize", aoRolar);
    };
  }, [pedirModelos]);

  useFrame((estado, delta) => {
    /* As pedras orbitam aqui também: é a mesma ilha, e vê-la parada no fundo
       depois de vê-la viva no modo 3D entregaria que são duas montagens. */
    orbitarPedras(ilha, estado.clock.elapsedTime);

    /* Sem movimento reduzido: interpolação exponencial, que é estável em
       qualquer taxa de quadros. Com movimento reduzido: corta seco. */
    atual.current = reduzido
      ? alvo.current
      : atual.current +
        (alvo.current - atual.current) * (1 - Math.exp(-5 * delta));

    moverSistema(sistema, estado.clock.elapsedTime, atual.current);

    /* A mesma interpolação exponencial do scroll, com o tempo escolhido para
       casar com `DURACAO_DA_TRANSICAO`: em `4,6 / segundo` a distância cai a
       4% do caminho que falta no fim dos 700 ms. */
    const passo = reduzido
      ? 1
      : 1 - Math.exp(-(4600 / DURACAO_DA_TRANSICAO) * delta);
    afastamento.current +=
      (afastamentoAlvo.current - afastamento.current) * passo;

    /* A viagem é suavizada mais devagar que a rolagem (3 contra 5): ir para
       outra galáxia e voltar é um movimento longo, e no mesmo ritmo do resto
       ele fica colado na roda do mouse. */
    viagem.current = reduzido
      ? viagemAlvo.current
      : viagem.current +
        (viagemAlvo.current - viagem.current) * (1 - Math.exp(-3 * delta));

    poseDoFundo(
      camera,
      ilha,
      DESCANSO,
      MIRA,
      atual.current,
      afastamento.current,
      viagem.current,
    );

    /* A casca de estrelas segue a câmera na viagem — o porquê está em
       ESTRELAS_NA_VIAGEM. Depois da pose, e não antes: a conta usa a posição
       da câmera deste quadro, e uma ordem invertida deixaria o céu um quadro
       atrasado, que na rolagem rápida vira estrela derrapando. */
    estrelas.position
      .copy(camera.position)
      .multiplyScalar(viagem.current * ESTRELAS_NA_VIAGEM);
  });

  return (
    <>
      {/* A luz vem de cima e do lado, como no modo 3D. Sem sombra: o casco
          aqui é silhueta contra estrela, e um mapa de sombra para um fundo de
          página é custo sem imagem. */}
      <hemisphereLight
        args={[
          escuro ? 0x9fb3d9 : 0xffffff,
          escuro ? 0x20283a : 0xd8d2c4,
          escuro ? 0.7 : 1,
        ]}
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

export default function Mundo3D({ dict, locale, projetos }: Conteudo) {
  const reduzido =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const { resolvedTheme } = useTheme();
  const escuro = resolvedTheme !== "light";
  const conteudo = useMemo(
    () => ({ dict, locale, projetos }),
    [dict, locale, projetos],
  );

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
      <Cena reduzido={reduzido} escuro={escuro} conteudo={conteudo} />
    </Canvas>
  );
}
