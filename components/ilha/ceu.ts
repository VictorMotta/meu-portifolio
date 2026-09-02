import * as THREE from "three";

import { suavizar } from "@/components/ilha/camera-ilha";

/**
 * O céu em volta da ilha.
 *
 * A ilha é um planeta, e planeta tem céu. À noite: estrelas em toda a esfera,
 * planetas ao longe e a Lua no alto. De dia: o Sol no lugar de onde a luz já
 * vinha, e as mesmas estrelas atrás de uma claridade — como constelação vista
 * de dia, que existe e quase não se lê.
 *
 * NÃO é filha da ilha, e isso não é detalhe de arrumação. Três coisas medem a
 * ilha inteira com `Box3.setFromObject`: o enquadramento da vista geral, o
 * mapa de obstáculos da câmera e a altura do chão da física. Um céu de 110 de
 * raio dentro do grupo `ilha` jogaria a câmera para longe demais, faria a
 * câmera desviar de estrelas e mandaria a caneca derrubada cair até o
 * infinito. Como irmã, ela não entra em nenhuma dessas contas — e o raio do
 * clique também continua olhando só para a ilha.
 *
 * O céu fica PARADO no mundo. Quem gira é a câmera, em volta da ilha: por
 * isso dar a volta mostra outras estrelas e outros planetas, sem que nada
 * aqui precise se mexer.
 */

/**
 * Sorteio repetível.
 *
 * `Math.random` daria um céu diferente a cada recarga e a cada troca de tema —
 * e a troca de tema reconstrói material, não geometria, então metade das
 * estrelas saltaria de lugar no clique do interruptor. Semente fixa é a mesma
 * decisão da tela do fliperama.
 */
function sorteio(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Quantas estrelas. */
const ESTRELAS = 5200;

/**
 * A casca onde as estrelas moram.
 *
 * A câmera orbita a uns 8,4 da origem e o `far` dela é 500, então qualquer
 * número entre esses dois serve. 60 a 115 dá profundidade: as de dentro se
 * movem visivelmente ao girar, as de fora quase não — é a paralaxe que faz o
 * céu parecer longe em vez de um papel de parede colado atrás.
 */
const DENTRO = 60;
const FORA = 115;

/**
 * As cores das estrelas no escuro.
 *
 * Estrela não é branca: é branca, azulada ou alaranjada, conforme a
 * temperatura. Três tons em proporções desiguais bastam para o campo não
 * parecer um chuvisco de televisão.
 */
const CORES_DA_NOITE = [
  { cor: 0xffffff, peso: 0.62 },
  { cor: 0xbcd4ff, peso: 0.26 },
  { cor: 0xffd9b0, peso: 0.12 },
];

function corDaEstrela(r: number) {
  let acumulado = 0;
  for (const { cor, peso } of CORES_DA_NOITE) {
    acumulado += peso;
    if (r <= acumulado) return cor;
  }
  return 0xffffff;
}

/**
 * Um ponto na casca, distribuído por igual na esfera.
 *
 * Sortear os dois ângulos direto amontoaria estrelas nos polos, porque as
 * faixas perto do polo têm menos área. O `acos(1 - 2u)` corrige isso — é a
 * amostragem uniforme de esfera, e sem ela dá para ver dois tufos no céu.
 */
function pontoNaEsfera(aleatorio: () => number) {
  const raio = DENTRO + aleatorio() * (FORA - DENTRO);
  const inclinacao = Math.acos(1 - 2 * aleatorio());
  const volta = aleatorio() * Math.PI * 2;
  const seno = Math.sin(inclinacao);
  return new THREE.Vector3(
    raio * seno * Math.cos(volta),
    raio * Math.cos(inclinacao),
    raio * seno * Math.sin(volta),
  );
}

/**
 * O campo de estrelas.
 *
 * Exportado porque o fundo da página rolável usa o MESMO campo: é a mesma
 * constelação vista do mesmo lugar, e duas nuvens de estrelas diferentes no
 * mesmo site seriam dois céus.
 *
 * Cor por vértice, e não um material por tom: três materiais seriam três
 * chamadas de desenho e três nuvens sobrepostas. O tamanho varia por estrela
 * pelo mesmo motivo de sempre — céu com todas as estrelas do mesmo tamanho
 * parece grade, não céu.
 */
export function construirEstrelas() {
  const aleatorio = sorteio(0x51a17a);
  const posicoes = new Float32Array(ESTRELAS * 3);
  const cores = new Float32Array(ESTRELAS * 3);
  const tamanhos = new Float32Array(ESTRELAS);
  const tinta = new THREE.Color();

  for (let i = 0; i < ESTRELAS; i++) {
    const p = pontoNaEsfera(aleatorio);
    posicoes[i * 3] = p.x;
    posicoes[i * 3 + 1] = p.y;
    posicoes[i * 3 + 2] = p.z;

    tinta.setHex(corDaEstrela(aleatorio()));
    /* Brilho desigual: a maioria fraca, poucas fortes. Elevar o sorteio ao
       cubo é o que empurra a massa para baixo e deixa umas poucas se
       destacarem — sem isso o céu fica com todas na mesma intensidade. */
    const brilho = 0.35 + Math.pow(aleatorio(), 3) * 0.65;
    cores[i * 3] = tinta.r * brilho;
    cores[i * 3 + 1] = tinta.g * brilho;
    cores[i * 3 + 2] = tinta.b * brilho;

    tamanhos[i] = 0.5 + Math.pow(aleatorio(), 2.2) * 1.9;
  }

  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute("position", new THREE.BufferAttribute(posicoes, 3));
  geometria.setAttribute("color", new THREE.BufferAttribute(cores, 3));
  geometria.setAttribute("size", new THREE.BufferAttribute(tamanhos, 1));

  /* `PointsMaterial` tem um tamanho só para a nuvem inteira, então o atributo
     por estrela pede shader próprio. São poucas linhas e evitam dividir o céu
     em várias nuvens só para ter três tamanhos.

     `opacidade` é uniforme e não constante porque é ela que o tema mexe: de
     dia as estrelas continuam lá, fracas, como constelação vista à luz do
     sol. */
  const material = new THREE.ShaderMaterial({
    uniforms: {
      opacidade: { value: 1 },
      escala: { value: 1 },
    },
    vertexShader: `
      attribute float size;
      varying vec3 vCor;
      uniform float escala;
      void main() {
        vCor = color;
        vec4 posicaoNoOlho = modelViewMatrix * vec4(position, 1.0);
        /* Tamanho em pixels que cai com a distância: é o que dá profundidade
           ao campo quando a câmera gira. */
        gl_PointSize = size * escala * (300.0 / -posicaoNoOlho.z);
        gl_Position = projectionMatrix * posicaoNoOlho;
      }
    `,
    fragmentShader: `
      varying vec3 vCor;
      uniform float opacidade;
      void main() {
        /* Ponto quadrado é pixel morto; o disco com borda desfocada é o que
           faz a estrela parecer luz. */
        vec2 daBorda = gl_PointCoord - vec2(0.5);
        float distancia = length(daBorda);
        if (distancia > 0.5) discard;
        float suave = smoothstep(0.5, 0.06, distancia);
        gl_FragColor = vec4(vCor, suave * opacidade);
      }
    `,
    transparent: true,
    depthWrite: false,
    vertexColors: true,
    /* Soma em vez de cobrir: estrela é luz, e duas próximas somam brilho em
       vez de uma tapar a outra. */
    blending: THREE.AdditiveBlending,
  });

  const pontos = new THREE.Points(geometria, material);
  pontos.name = "estrelas";
  /* A caixa envolvente desta nuvem é a casca inteira, e o corte de frustum
     não tem o que economizar aqui: são 2600 pontos, e desligá-lo evita a
     nuvem sumir quando o centro dela sai do campo de visão. */
  pontos.frustumCulled = false;
  return pontos;
}

/**
 * Cada planeta: em que volta do horizonte, a que altura, de que tamanho e cor.
 *
 * `volta` espalha os seis pelos 360° para que girar a ilha sempre traga outro
 * à vista — dois no mesmo lado deixariam metade da órbita vazia. `elevacao`
 * em radianos, e a maioria é NEGATIVA de propósito: abaixo do horizonte é
 * onde está a maior parte do céu que a câmera mostra, porque a ilha flutua e
 * embaixo dela não há chão nenhum.
 */
const PLANETAS = [
  {
    nome: "planeta_azul",
    volta: -3.9,
    altura: 6,
    dist: 74,
    raio: 3.4,
    cor: 0x3f6ea8,
    anel: false,
  },
  {
    nome: "planeta_ocre",
    volta: 1.1,
    altura: -1,
    dist: 58,
    raio: 4.6,
    cor: 0xb07a4a,
    anel: true,
  },
  {
    nome: "planeta_pequeno",
    volta: 2.9,
    altura: 7,
    dist: 88,
    raio: 2.2,
    cor: 0x8a6f9e,
    anel: false,
  },
  {
    nome: "planeta_gelo",
    volta: -0.5,
    altura: -18,
    dist: 66,
    raio: 2.6,
    cor: 0x9fc4cf,
    anel: false,
  },
  {
    nome: "planeta_rubro",
    volta: 0.3,
    altura: -42,
    dist: 78,
    raio: 3.6,
    cor: 0xa8523f,
    anel: false,
  },
  {
    nome: "planeta_verde",
    volta: -1.4,
    altura: -12,
    dist: 52,
    raio: 1.8,
    cor: 0x4f8f72,
    anel: false,
  },
] as const;

/**
 * Os planetas.
 *
 * Facetados de propósito: um icosaedro de duas subdivisões contra o casco de
 * ferro da ilha é a mesma linguagem. Esfera lisa aqui pediria textura, e
 * textura de planeta a 50 de distância é peso que ninguém vê.
 *
 * Eles têm emissivo fraco porque a luz direcional da cena aponta para a ilha
 * e não alcança quem está a 50 daqui: sem um mínimo de luz própria, os
 * planetas ficariam pretos contra o preto.
 */
function planetas() {
  const grupo = new THREE.Group();
  grupo.name = "planetas";

  for (const p of PLANETAS) {
    const material = new THREE.MeshStandardMaterial({
      name: p.nome,
      color: p.cor,
      roughness: 0.9,
      metalness: 0,
      emissive: p.cor,
      emissiveIntensity: 0.32,
      flatShading: true,
    });
    const corpo = new THREE.Mesh(
      new THREE.IcosahedronGeometry(p.raio, 2),
      material,
    );
    corpo.name = p.nome;
    corpo.position.copy(noCeu(p.volta, p.altura, p.dist));
    corpo.castShadow = false;
    corpo.receiveShadow = false;

    if (p.anel) {
      const anel = new THREE.Mesh(
        new THREE.RingGeometry(p.raio * 1.5, p.raio * 2.3, 48),
        new THREE.MeshBasicMaterial({
          name: `${p.nome}_anel`,
          color: 0xd8b48a,
          transparent: true,
          opacity: 0.45,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      anel.name = `${p.nome}_anel`;
      anel.rotation.set(-1.1, 0.4, 0.2);
      corpo.add(anel);
    }

    grupo.add(corpo);
  }
  return grupo;
}

/**
 * A textura da Lua: cinza com crateras.
 *
 * Desenhada aqui e não baixada porque é um disco de poucos pixels na tela: um
 * mapa de lua de verdade seria megabytes para o que cabe em 512 e uma dúzia
 * de manchas. Semente fixa pelo mesmo motivo das estrelas.
 */
function texturaDaLua() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const p = c.getContext("2d");
  if (!p) return null;

  p.fillStyle = "#c8c9cf";
  p.fillRect(0, 0, 512, 256);

  const aleatorio = sorteio(0x1a2b3c);
  /* Os mares primeiro, grandes e escuros; as crateras por cima, pequenas e
     com a borda clara — é a borda que faz a mancha virar cratera em vez de
     borrão. */
  for (let i = 0; i < 9; i++) {
    const x = aleatorio() * 512;
    const y = 40 + aleatorio() * 176;
    const r = 26 + aleatorio() * 52;
    const gradiente = p.createRadialGradient(x, y, 0, x, y, r);
    gradiente.addColorStop(0, "rgba(150,152,163,0.85)");
    gradiente.addColorStop(1, "rgba(150,152,163,0)");
    p.fillStyle = gradiente;
    p.beginPath();
    p.arc(x, y, r, 0, Math.PI * 2);
    p.fill();
  }
  for (let i = 0; i < 46; i++) {
    const x = aleatorio() * 512;
    const y = 16 + aleatorio() * 224;
    const r = 3 + aleatorio() * 13;
    p.fillStyle = "rgba(168,170,180,0.9)";
    p.beginPath();
    p.arc(x, y, r, 0, Math.PI * 2);
    p.fill();
    p.strokeStyle = "rgba(226,227,233,0.8)";
    p.lineWidth = 1.6;
    p.beginPath();
    p.arc(x, y, r, 0, Math.PI * 2);
    p.stroke();
  }

  const textura = new THREE.CanvasTexture(c);
  textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}

/**
 * A altura em que a Lua e o Sol ficam, e por que é tão baixa.
 *
 * Isto foi medido, não escolhido. A órbita da vista geral tem elevação de
 * 0,4 rad e a abertura vertical da câmera é 45°: ela olha 22,9° para BAIXO, e
 * o topo do quadro cai 0,4° ABAIXO da linha do horizonte. Ou seja: o céu que
 * a câmera mostra vai da silhueta da ilha (uns 3,7° abaixo do horizonte, no
 * alto da lamparina) até o horizonte — uma faixa de pouco mais de três graus.
 *
 * Nada colocado no zênite seria visto. Nunca. A Lua "bem em cima" existiria e
 * ficaria fora do quadro a vida inteira. Então ela fica nesta faixa: no céu,
 * acima da ilha, grande — que é o que "em cima" quer dizer para quem olha.
 *
 * Já os planetas usam também o que sobra ABAIXO do horizonte, que é a maior
 * parte do quadro: a ilha flutua, então embaixo dela é céu, não chão.
 *
 * A Lua e o Sol ficam em lados opostos porque nunca aparecem juntos: cada um
 * é de um tema, e opostos garantem que trocar de tema troque o céu inteiro em
 * vez de piscar uma bola no mesmo lugar.
 */
/**
 * A altura da Lua e do Sol, em Y do mundo — e por que é um número absoluto e
 * não um ângulo.
 *
 * O grupo `ilha` é deslocado para que a base dele fique em y=0, então o DECK
 * está em y ≈ 5,03 e a mobília vai até uns 7,1. O céu não sofre esse
 * deslocamento. Enquanto a Lua e o Sol saíam de um ângulo de elevação sobre a
 * origem, os dois caíam em y = 1,74: abaixo do piso da sala. Estavam
 * literalmente embaixo da ilha, e por isso não pareciam estar no céu.
 *
 * As duas alturas saem de onde cada astro CABE, e são diferentes porque as
 * distâncias são diferentes: o mesmo Y visto de 38 sobe mais no quadro do que
 * visto de 110. Com a órbita em 0,30 rad, o topo do quadro fica 5,3° acima do
 * horizonte e o olho da câmera a 7,54; a Lua em 5 aparece a 19% do topo e o
 * Sol em 3 a 17%, os dois inteiros, acima da sala e abaixo da borda.
 */
const ALTURA_DA_LUA = 5;
const ALTURA_DO_SOL = 3;

/**
 * A Lua é perto e o Sol é longe, como no céu de verdade.
 *
 * A Lua a 38 com 3,6 de raio ocupa 4,6° do céu; o Sol a 110 com 13 ocupa 6,3°.
 * Ele é quase quatro vezes mais distante e mais de três vezes maior — e
 * aparece um pouco maior, que é o que "o Sol é longe mesmo, grandão" quer
 * dizer. Trocar as duas distâncias faria a Lua virar um segundo sol.
 */
const DISTANCIA_DA_LUA = 38;
const DISTANCIA_DO_SOL = 110;

function noCeu(volta: number, altura: number, distancia: number) {
  return new THREE.Vector3(
    Math.sin(volta) * distancia,
    altura,
    Math.cos(volta) * distancia,
  );
}

/**
 * Um halo: o disco que faz a Lua e o Sol terem borda de luz em vez de recorte.
 *
 * É um `Sprite`, então encara a câmera sozinho de qualquer ângulo. A textura é
 * um gradiente radial — a mesma conta de sempre, e mais barata que um shader
 * para duas peças.
 */
function halo(cor: string, tamanho: number, nome: string) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const p = c.getContext("2d");
  if (!p) return null;
  const g = p.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, cor);
  g.addColorStop(0.35, cor.replace(/[\d.]+\)$/, "0.35)"));
  g.addColorStop(1, cor.replace(/[\d.]+\)$/, "0)"));
  p.fillStyle = g;
  p.fillRect(0, 0, 128, 128);

  const textura = new THREE.CanvasTexture(c);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textura,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  sprite.name = nome;
  sprite.scale.setScalar(tamanho);
  return sprite;
}

/**
 * Para onde a câmera olha na vista geral.
 *
 * `ORBITA_INICIAL.angulo` é 0,6, e esse ângulo é onde a CÂMERA está, não para
 * onde ela aponta: ela olha para a origem, ou seja, para o céu do lado
 * oposto. Meia volta depois é onde a Lua e o Sol precisam estar para serem a
 * primeira coisa que o visitante vê — o resto do céu ele encontra girando.
 *
 * O desvio tira a peça do centro exato do quadro, onde ela ficaria atrás da
 * ilha, e a joga para a ESQUERDA: à direita ficam os botões de tema, idioma e
 * currículo, e a Lua nascia atrás deles.
 */
const OLHAR_INICIAL = 0.6 + Math.PI + 0.34;

/** A Lua: só no escuro. */
function lua() {
  const grupo = new THREE.Group();
  grupo.name = "lua";
  grupo.position.copy(noCeu(OLHAR_INICIAL, ALTURA_DA_LUA, DISTANCIA_DA_LUA));

  const material = new THREE.MeshStandardMaterial({
    name: "lua_superficie",
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
    /* A luz da cena aponta para a ilha e não chega aqui; o emissivo é o que
       faz a Lua ser vista. Fraco o bastante para as crateras continuarem
       aparecendo — emissivo forte apaga o desenho. */
    emissive: 0xdfe3ee,
    emissiveIntensity: 0.62,
  });
  const textura = texturaDaLua();
  if (textura) {
    material.map = textura;
    material.emissiveMap = textura;
  }

  const corpo = new THREE.Mesh(new THREE.SphereGeometry(3.6, 40, 28), material);
  corpo.name = "lua_corpo";
  corpo.rotation.y = 0.6;
  grupo.add(corpo);

  /* O halo é o que dá borda de luz à Lua; passando disso ele vira um borrão
     que lava o canto do quadro inteiro. */
  const brilho = halo("rgba(214,224,255,0.42)", 17, "lua_halo");
  if (brilho) grupo.add(brilho);
  return grupo;
}

/** O Sol: só no claro. */
function sol() {
  const grupo = new THREE.Group();
  grupo.name = "sol";
  grupo.position.copy(noCeu(OLHAR_INICIAL, ALTURA_DO_SOL, DISTANCIA_DO_SOL));

  /* Dourado, e não o creme quase branco que era antes: o fundo do tema claro é
     quase branco, e um sol pálido nele simplesmente não existe. `MeshBasic`
     porque o Sol não é iluminado por nada — ele É a luz. */
  const corpo = new THREE.Mesh(
    new THREE.SphereGeometry(13, 48, 32),
    new THREE.MeshBasicMaterial({ name: "sol_corpo", color: 0xffc23f }),
  );
  corpo.name = "sol_corpo";
  grupo.add(corpo);

  const brilho = halo("rgba(255,186,74,0.85)", 84, "sol_halo");
  if (brilho) grupo.add(brilho);
  return grupo;
}

export function construirCeu(): THREE.Group {
  const ceu = new THREE.Group();
  ceu.name = "ceu";
  ceu.add(construirEstrelas());
  ceu.add(planetas());
  ceu.add(lua());
  ceu.add(sol());

  /* Céu não projeta nem recebe sombra. O mapa de sombra da direcional cobre
     12 x 12 em volta da ilha, então nada daqui entraria nele de qualquer
     forma — mas a bandeira evita que a peça entre na conta do passe. */
  ceu.traverse((no) => {
    no.castShadow = false;
    no.receiveShadow = false;
  });
  return ceu;
}

/**
 * O céu segue o tema.
 *
 * No escuro é noite: estrelas cheias, planetas acesos, a Lua no alto.
 *
 * No claro NÃO é o mesmo céu com o brilho baixo — é outro céu. As estrelas
 * ficam, porque foi o pedido, mas precisam mudar de cor para continuarem
 * visíveis: branco sobre fundo claro é invisível, então elas passam a ser um
 * azul-ardósia e o `AdditiveBlending` dá lugar ao normal, que é o único que
 * escurece. É constelação vista de dia, atrás da claridade.
 */
export function ajustarCeu(ceu: THREE.Object3D, escuro: boolean) {
  const estrelas = ceu.getObjectByName("estrelas") as THREE.Points | undefined;
  if (estrelas) ajustarEstrelas(estrelas, escuro);

  const luaVisivel = escuro;
  const lua = ceu.getObjectByName("lua");
  if (lua) lua.visible = luaVisivel;
  const sol = ceu.getObjectByName("sol");
  if (sol) sol.visible = !luaVisivel;

  const planetas = ceu.getObjectByName("planetas");
  if (planetas) {
    planetas.traverse((no) => {
      const malha = no as THREE.Mesh;
      if (!malha.isMesh) return;
      const material = malha.material as THREE.MeshStandardMaterial;
      /* De dia o planeta é um corpo iluminado, não uma lanterna: o emissivo
         cai quase a zero e o que resta é a cor sob a luz da cena. */
      if (material.emissive) material.emissiveIntensity = escuro ? 0.32 : 0.06;
    });
  }
}

/** Descarta geometria, material e textura do céu — nenhum deles é do JS. */
export function descartarCeu(ceu: THREE.Object3D) {
  ceu.traverse((no) => {
    const malha = no as THREE.Mesh & {
      material?: THREE.Material | THREE.Material[];
    };
    if (malha.geometry) malha.geometry.dispose();
    const materiais = Array.isArray(malha.material)
      ? malha.material
      : malha.material
        ? [malha.material]
        : [];
    for (const material of materiais) {
      const comMapa = material as THREE.MeshStandardMaterial & {
        map?: THREE.Texture | null;
      };
      comMapa.map?.dispose();
      comMapa.emissiveMap?.dispose();
      material.dispose();
    }
  });
}

/**
 * O reflexo do céu, para o ferro ter o que espelhar.
 *
 * Metal em três.js não tem cor difusa: o que se vê num material metálico é o
 * ambiente refletido. Sem mapa de ambiente, a conta resolve para PRETO — foi
 * o que deixou o casco da ilha um borrão chapado no tema claro assim que ele
 * virou ferro. Não é bug do material; é o que "metal" significa no
 * renderizador.
 *
 * O ambiente é um degradê de duas cores num equiretangular minúsculo: claro
 * em cima, escuro embaixo. 64 x 32 basta porque o `PMREMGenerator` borra tudo
 * de qualquer jeito para virar reflexo difuso — resolução aqui seria memória
 * jogada fora.
 *
 * E ele muda com o tema, o que é a parte bonita: de noite o casco reflete o
 * azul quase preto do espaço, de dia reflete a claridade. A ilha de ferro
 * espelha o próprio céu.
 *
 * O mapa NÃO vai para `scene.environment`, por dois motivos. O primeiro é que
 * dali ele valeria para tudo — a madeira, o tecido, o papel — e mudaria a
 * iluminação de uma sala inteira que já está do jeito que se quer. O segundo
 * é que `scene` vem de um hook, e o compilador do React barra escrever nele.
 * Quem recebe o reflexo são só os materiais do casco, por `envMap`.
 */
export function ambienteDoCeu(
  renderizador: THREE.WebGLRenderer,
  escuro: boolean,
): THREE.Texture | null {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 32;
  const p = c.getContext("2d");
  if (!p) return null;

  const g = p.createLinearGradient(0, 0, 0, 32);
  if (escuro) {
    g.addColorStop(0, "#2c3854");
    g.addColorStop(0.5, "#131a2a");
    g.addColorStop(1, "#05070c");
  } else {
    g.addColorStop(0, "#eef3fb");
    g.addColorStop(0.5, "#c3cede");
    g.addColorStop(1, "#6a7488");
  }
  p.fillStyle = g;
  p.fillRect(0, 0, 64, 32);

  const plano = new THREE.CanvasTexture(c);
  plano.mapping = THREE.EquirectangularReflectionMapping;
  plano.colorSpace = THREE.SRGBColorSpace;

  /* O PMREM pré-borra o mapa nos vários níveis de aspereza. Sem ele o reflexo
     sairia espelhado e nítido, o que num casco fosco não existe. */
  const pmrem = new THREE.PMREMGenerator(renderizador);
  const ambiente = pmrem.fromEquirectangular(plano).texture;
  pmrem.dispose();
  plano.dispose();
  return ambiente;
}

/**
 * Os materiais do casco recebem o reflexo do céu.
 *
 * Achados pelo nome: `cena.ts` batiza todo o ferro da ilha com o prefixo
 * `iron` — a borda, a crosta, o casco e o friso do deck — e o vidro do domo de
 * `vidro`. É o mesmo contrato dos `_modelo` da física: o nome é a interface
 * entre os arquivos.
 *
 * O domo entra na mesma lista porque vidro tem o mesmo problema do metal: o
 * que se vê nele é reflexo. Sem mapa de ambiente ele é uma película cinza; com
 * ele, pega o céu na curva e vira cúpula.
 *
 * Devolve a função que desfaz. Sem ela, trocar de tema deixaria o mapa antigo
 * pendurado nos materiais e vazando na placa de vídeo.
 */
export function refletirNoFerro(
  ilha: THREE.Object3D,
  ambiente: THREE.Texture | null,
) {
  const tocados: THREE.MeshStandardMaterial[] = [];
  ilha.traverse((no) => {
    const malha = no as THREE.Mesh;
    if (!malha.isMesh) return;
    const materiais = Array.isArray(malha.material)
      ? malha.material
      : [malha.material];
    for (const bruto of materiais) {
      const material = bruto as THREE.MeshStandardMaterial;
      const nome = material?.name ?? "";
      if (!nome.startsWith("iron") && !nome.startsWith("vidro")) continue;
      if (tocados.includes(material)) continue;
      material.envMap = ambiente;
      /* Acima de 1 o casco vira espelho de vitrine; abaixo de 0,6 ele volta a
         escurecer para o preto que o mapa veio resolver. O vidro pede mais:
         ele quase não tem cor própria, e é o reflexo que o desenha — mas só um
         pouco mais: em 1,6 a cúpula devolvia tanto céu que apagava o céu de
         verdade atrás dela. */
      material.envMapIntensity = nome.startsWith("vidro") ? 0.9 : 0.85;
      material.needsUpdate = true;
      tocados.push(material);
    }
  });
  return () => {
    for (const material of tocados) {
      material.envMap = null;
      material.needsUpdate = true;
    }
  };
}

/**
 * De onde a luz de fora vem.
 *
 * Do lado do Sol de dia e do lado da Lua de noite — os dois moram na mesma
 * volta do horizonte (`OLHAR_INICIAL`), então o que muda entre os temas não é
 * a direção, é a cor e a força. A direcional apontava para (4, 7, 5), um canto
 * escolhido a olho, e as sombras da sala caíam para um lado enquanto o astro
 * estava no outro.
 *
 * A ELEVAÇÃO daqui não é a do astro, e isso é deliberado. O Sol e a Lua ficam
 * quase na linha do horizonte porque é só lá que a câmera os enxerga (ver
 * `ALTURA_NO_CEU`); uma luz rasante assim deixaria a sala em contraluz, com
 * sombras de dois metros atravessando o deck e a mobília toda escura de
 * frente. O que o pedido quer é que a luz venha DO LADO do astro — e isso a
 * volta resolve sozinha. A altura fica com o ângulo que ilumina uma sala.
 */
export function direcaoDaLuz(): [number, number, number] {
  const ELEVACAO = 0.86;
  const DISTANCIA = 13;
  const horizontal = Math.cos(ELEVACAO) * DISTANCIA;
  return [
    Math.sin(OLHAR_INICIAL) * horizontal,
    Math.sin(ELEVACAO) * DISTANCIA,
    Math.cos(OLHAR_INICIAL) * horizontal,
  ];
}

/**
 * As estrelas seguem o tema.
 *
 * No claro elas precisam ESCURECER para aparecer sobre um fundo quase branco,
 * e `AdditiveBlending` não escurece nada — somar luz sobre branco devolve
 * branco. A mistura normal é a única que consegue, e é ela que faz a
 * constelação existir de dia, atrás da claridade.
 *
 * Separada de `ajustarCeu` porque o fundo da página rolável usa só a nuvem de
 * estrelas, sem Lua, Sol nem planetas: as duas telas compartilham esta regra
 * em vez de cada uma ter a sua.
 */
export function ajustarEstrelas(estrelas: THREE.Points, escuro: boolean) {
  const material = estrelas.material as THREE.ShaderMaterial;
  material.uniforms.opacidade!.value = escuro ? 1 : 0.5;
  material.uniforms.escala!.value = escuro ? 1 : 0.8;
  material.blending = escuro ? THREE.AdditiveBlending : THREE.NormalBlending;
  material.needsUpdate = true;
}

/**
 * Um quadro do fundo da página rolável: a constelação girando e a ilha
 * passando por dentro dela, as duas conforme a rolagem.
 *
 * Mora aqui, e não no componente, por dois motivos. O céu é assunto deste
 * arquivo; e o compilador do React barra escrever em objeto que veio de um
 * hook — passar o objeto para uma função é como a ilha já resolve isso em
 * `acenderLamparinas` e `integrar`.
 *
 * `progresso` vai de 0 (topo da página) a 1 (fim).
 */
export function passarOFundo(
  estrelas: THREE.Object3D,
  ilha: THREE.Object3D,
  progresso: number,
) {
  /* Quase uma volta inteira de céu de ponta a ponta da página: é o que faz
     passar estrelas DIFERENTES conforme se desce, em vez de olhar o mesmo
     pedaço do começo ao fim. A inclinação junto evita que elas corram todas
     na horizontal, como letreiro. */
  estrelas.rotation.y = progresso * 2.4;
  estrelas.rotation.x = progresso * 0.35;

  /* A ilha DESCE pela margem direita conforme a página rola, girando sobre o
     próprio eixo. A margem é onde ela cabe: o conteúdo da página é uma coluna
     opaca no meio, e no meio ela simplesmente sumia atrás dos cartões de
     projeto. Aqui ela fica grande, um pouco cortada pela borda — planeta
     passando ao lado, que é o que dá a ênfase sem disputar com o texto.

     Descer, e não subir: a leitura desce, e um corpo subindo contra a rolagem
     puxa o olho para trás. */
  ilha.rotation.y = 0.6 + progresso * 2.0;
  ilha.position.set(11.4 - progresso * 1.8, 2.6 - progresso * 6.4, 0);
}

/**
 * O afastamento da câmera do fundo, como fator de distância.
 *
 * 1 é o repouso. Abaixo de 1 a câmera está PERTO da ilha, que é como ela
 * chega quando o visitante acaba de sair do modo 3D — e é de onde ela sai
 * quando ele está voltando para lá. Acima de 1 seria longe demais para o
 * fundo de uma página.
 *
 * 0,3 é o quanto do caminho a metade da página cobre: o resto do zoom é
 * coberto pela metade da ilha, que vai de 3,2 até 1 na órbita dela. Dividir
 * assim é o que faz as duas metades parecerem um movimento só, em vez de duas
 * animações discutindo.
 */
export const PERTO_DA_ILHA = 0.3;

/**
 * Aplica o afastamento movendo a câmera na direção em que ela já olha.
 *
 * Mexer na distância e não no campo de visão porque `fov` deforma: aproximar
 * por lente achata a cena e denuncia que é truque. E como a mira é fixa, a
 * direção sai da diferença entre o olho e o alvo, uma vez.
 */
export function afastarFundo(
  camera: THREE.Camera,
  descanso: THREE.Vector3,
  mira: THREE.Vector3,
  fator: number,
) {
  camera.position.copy(mira).addScaledVector(descanso.clone().sub(mira), fator);
  camera.lookAt(mira);
}

/**
 * Onde a câmera do fundo fica, no meio do caminho entre ver o sistema inteiro
 * e estar em cima da ilha.
 *
 * No topo da página vale a pose de descanso, que enquadra o Sol e as órbitas.
 * Conforme se rola, a câmera MERGULHA na ilha e termina colada nela — é onde
 * a página tem a coluna de contato à esquerda e um vão à direita, e é esse vão
 * que a ilha passa a ocupar.
 *
 * Duas coisas tornam isto menos trivial do que interpolar dois pontos fixos: a
 * ilha ANDA (ela percorre a terceira órbita), então o destino do mergulho tem
 * de ser lido a cada quadro; e o zoom da troca de modo continua valendo por
 * cima, aproximando ainda mais quando o visitante vai para o 3D.
 *
 * Os 25 de recuo saíram de medir: em 17, que foi a primeira tentativa, a ilha
 * ocupava quase 80% da altura do quadro e, com o desvio da mira, saía pela
 * borda direita — via-se uma fatia dela. Em 25 ela cabe inteira na metade
 * direita, que é o vão que a página deixa ao lado do formulário de contato.
 */
const RECUO_NA_ILHA = new THREE.Vector3(-1, 7.5, 25);
const DESVIO_DA_MIRA = new THREE.Vector3(-6.7, 3.4, 0);

/**
 * As mesmas três poses, para uma janela EM PÉ.
 *
 * Tudo aqui em cima foi medido numa janela deitada, onde o texto mora numa
 * coluna à esquerda e sobra a metade direita da tela para o cenário. Num
 * celular não existe essa metade: o texto ocupa a largura inteira e o 3D passa
 * por trás dele. Os desvios laterais, que naquele desenho empurram o sistema
 * para o vão livre, aqui empurram para FORA do quadro — e o campo horizontal
 * de uma tela em pé é estreito, então basta pouco para sair.
 *
 * Era isso que se via no celular: no topo, uma fatia de Saturno na borda; na
 * Stack, um preto sem nada, com o sistema fora da tela; e no fim da página, a
 * ilha cortada pela borda direita em vez de enquadrada.
 *
 * Então em pé os desvios vão a zero e o sistema fica CENTRADO, atrás do texto.
 * A distância de descanso sobe de 88 para 163 porque agora ele precisa caber
 * na largura: a órbita externa tem raio 29, e 58 de diâmetro num campo
 * horizontal estreito só cabem de longe. Em 163 sobram 2 unidades de folga de
 * cada lado — medido, não estimado. É o "talvez ser menor": é menor mesmo, e
 * inteiro, que era o pedido.
 *
 * No fim da página, ao contrário, a câmera chega MAIS PERTO (21 contra 25):
 * sem o desvio lateral a ilha não precisa mais de recuo para caber ao lado da
 * mira, e o fim da página é onde ela deve encher o quadro.
 */
const DESCANSO_EM_PE = new THREE.Vector3(0, 83, 140);
const MIRA_EM_PE = new THREE.Vector3(0, 0, 0);
const RECUO_NA_ILHA_EM_PE = new THREE.Vector3(0, 6.5, 21);
const DESVIO_DA_MIRA_EM_PE = new THREE.Vector3(0, 2.5, 0);

/**
 * A pose da viagem: onde a câmera vai enquanto a seção de Stack está na tela.
 *
 * A ideia é a da página: ali o visitante não está mais neste sistema, está
 * numa outra galáxia — a das ferramentas, que é a órbita de CSS desenhada por
 * cima. Então o sistema com a ilha precisa ficar *para trás*, pequeno e num
 * canto, e não sumir: sumir seria trocar de cenário, e a página inteira se
 * apoia em ser um lugar só visto de distâncias diferentes.
 *
 * O olho vai de 89 para 311 de distância da origem — três vezes e meia, que é
 * o que encolhe o sistema até ele virar um detalhe num canto.
 *
 * A mira desce e vai para a esquerda do sistema — é isso, e não uma rotação,
 * que joga o Sol e a ilha para o alto da direita. Mirar no sistema e girar a
 * câmera daria o mesmo enquadramento com metade do controle. E o desvio da
 * mira cresce junto com a distância: parado, ele viraria um ângulo cada vez
 * menor e o sistema escorregaria de volta para o meio do quadro conforme a
 * câmera recua.
 *
 * A 311 a câmera fica bem fora da casca de estrelas, que vive entre 60 e 115 —
 * daí `ESTRELAS_NA_VIAGEM` logo abaixo.
 */
const LONGE_OLHO = new THREE.Vector3(-48, 147, 269);
const LONGE_MIRA = new THREE.Vector3(-96, -49, 9);

/**
 * A viagem numa janela em pé.
 *
 * A mesma ideia — o sistema pequeno e num canto, lá atrás — com o desvio
 * cortado a um terço. Na janela deitada a mira sai 107 de distância do
 * sistema, e num campo horizontal estreito isso o joga para fora do quadro:
 * era o preto liso da segunda captura. Aqui ela sai 35, que num quadro em pé é
 * o mesmo CANTO, não a mesma distância em metros.
 */
const LONGE_OLHO_EM_PE = new THREE.Vector3(-20, 150, 272);
const LONGE_MIRA_EM_PE = new THREE.Vector3(-30, -14, 10);

/**
 * Quanto a casca de estrelas acompanha a câmera na viagem.
 *
 * Sozinha ela não acompanharia nada, e é aí que o problema aparece: a 311 de
 * distância a casca inteira abre uns 40° e a mira aponta 20° para fora dela,
 * então metade do quadro — justo a metade esquerda, onde mora o texto — ficaria
 * num preto liso, sem uma estrela. Levando a casca por 75% do caminho, a câmera
 * volta a ficar dentro dela (78 de 115) e o céu continua cheio para todo lado.
 *
 * 75% e não 100%: no cheio a casca ficaria colada na câmera e as estrelas
 * parariam de escorrer umas contra as outras. O quarto que sobra é a paralaxe,
 * que é o que faz a viagem parecer viagem.
 */
export const ESTRELAS_NA_VIAGEM = 0.75;

/** Onde o mergulho começa e onde termina, em fração da página rolada. */
const INICIO_DO_MERGULHO = 0.45;
const FIM_DO_MERGULHO = 0.9;

export function poseDoFundo(
  camera: THREE.Camera,
  ilha: THREE.Object3D,
  descanso: THREE.Vector3,
  mira: THREE.Vector3,
  rolagem: number,
  afastamento: number,
  /* 0 = neste sistema; 1 = na outra galáxia, com este lá atrás. */
  viagem: number,
  /**
   * Quanto a janela está EM PÉ: 0 numa tela deitada, 1 num celular. Não é um
   * interruptor por largura porque a composição não muda de repente — ela
   * escorrega, e um tablet em pé fica no meio do caminho, que é onde ele deve
   * estar.
   */
  emPe: number,
) {
  const bruto =
    (rolagem - INICIO_DO_MERGULHO) / (FIM_DO_MERGULHO - INICIO_DO_MERGULHO);
  const t = suavizar(Math.min(1, Math.max(0, bruto)));

  const naIlha = new THREE.Vector3();
  ilha.getWorldPosition(naIlha);

  /* Cada par de poses mistura pela proporção da janela ANTES de entrar na
     conta do mergulho. Misturar depois daria o mesmo resultado nas pontas e um
     caminho torto no meio: a interpolação entre duas interpolações não é a
     interpolação das pontas quando as curvas de suavização diferem. */
  const descansoAqui = descanso.clone().lerp(DESCANSO_EM_PE, emPe);
  const miraAqui = mira.clone().lerp(MIRA_EM_PE, emPe);
  const recuoAqui = RECUO_NA_ILHA.clone().lerp(RECUO_NA_ILHA_EM_PE, emPe);
  const desvioAqui = DESVIO_DA_MIRA.clone().lerp(DESVIO_DA_MIRA_EM_PE, emPe);

  /* A mira desvia para a esquerda da ilha: assim ela cai na metade direita do
     quadro, longe da coluna de texto — a mesma razão pela qual a mira do
     sistema fica à esquerda do Sol. Em pé esse desvio é zero, e o porquê está
     em `DESCANSO_EM_PE`. */
  const alvo = miraAqui.lerp(naIlha.clone().add(desvioAqui), t);
  const olho = descansoAqui.lerp(naIlha.clone().add(recuoAqui), t);

  /* A viagem entra POR CIMA do mergulho, e não antes dele.
     As duas janelas não se encostam — a Stack acaba bem antes de o mergulho
     começar — mas escrever assim é o que garante que nunca briguem: se um dia
     uma seção crescer e as janelas se sobrepuserem, o resultado é a média das
     duas poses, e não um salto. */
  if (viagem > 0) {
    const v = suavizar(viagem);
    alvo.lerp(LONGE_MIRA.clone().lerp(LONGE_MIRA_EM_PE, emPe), v);
    olho.lerp(LONGE_OLHO.clone().lerp(LONGE_OLHO_EM_PE, emPe), v);
  }

  camera.position.copy(alvo).addScaledVector(olho.sub(alvo), afastamento);
  camera.lookAt(alvo);
}

/* ---------- o sistema solar do fundo da página ---------- */

/**
 * O raio de cada órbita, e qual delas é a da ilha.
 *
 * A ilha fica na TERCEIRA, que é onde fica a Terra — foi o pedido, e é o que
 * dá a piada: o mundo dele no lugar do nosso. As outras quatro distribuem-se
 * com espaçamento crescente, como num sistema de verdade, onde os intervalos
 * abrem conforme se afasta do Sol.
 *
 * São CINCO órbitas e não sete, e o motivo é a ilha. Com sete o sistema ficava
 * inteiro no quadro, mas a câmera tinha de recuar para 125 e a ilha virava um
 * ponto de 48 pixels — o corpo de que a página trata era o menos visível de
 * todos, que é o contrário da ideia. Com cinco a câmera vem para 89 e ela
 * quase dobra. Sistema solar se lê por ter um Sol no meio com órbitas em
 * volta, não por contar os planetas.
 *
 * O vão entre a segunda e a quarta (11,5 e 23) também é a ilha: com raio 4 ela
 * ocupa de 13 a 21, e órbitas mais juntas seriam atravessadas por ela.
 */
const ORBITAS = [7, 11.5, 17, 23, 29];
export const ORBITA_DA_ILHA = 2;

/** Uma volta de linha fina, para a órbita ser vista sem virar um anel opaco. */
function traçoDaOrbita(raio: number, escuro: boolean) {
  const pontos: THREE.Vector3[] = [];
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2;
    pontos.push(new THREE.Vector3(Math.cos(a) * raio, 0, Math.sin(a) * raio));
  }
  const linha = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pontos),
    new THREE.LineBasicMaterial({
      name: "traçoOrbita",
      color: escuro ? 0x5f7099 : 0x9aa7bd,
      transparent: true,
      opacity: escuro ? 0.34 : 0.42,
    }),
  );
  linha.name = `orbita_${raio}`;
  return linha;
}

/**
 * O sistema solar que o fundo da página rolável mostra.
 *
 * O Sol no meio, as órbitas desenhadas e um corpo em cada uma — e a terceira
 * vazia, esperando a ilha, que o componente encaixa lá. Cada corpo mora num
 * PIVÔ na origem: girar o pivô leva o corpo pela órbita sem que ninguém
 * precise recalcular seno e cosseno, e é o pivô que `moverSistema` roda.
 *
 * Não é o mesmo céu do modo 3D visto de outro lugar: lá a ilha é o centro e o
 * Sol está no horizonte dela, aqui o Sol é o centro e a ilha é um dos corpos.
 * São duas escalas da mesma história — a sala, e o lugar da sala no mundo.
 */
export function construirSistemaSolar(escuro: boolean): THREE.Group {
  const sistema = new THREE.Group();
  sistema.name = "sistema";

  const sol = new THREE.Mesh(
    new THREE.SphereGeometry(4.5, 48, 32),
    new THREE.MeshBasicMaterial({
      name: "sistema_sol",
      color: escuro ? 0xffb648 : 0xffc23f,
    }),
  );
  sol.name = "sistema_sol";
  sistema.add(sol);
  const brilho = halo("rgba(255,186,74,0.8)", 30, "sistema_sol_halo");
  if (brilho) sistema.add(brilho);

  ORBITAS.forEach((raio, i) => {
    sistema.add(traçoDaOrbita(raio, escuro));

    const pivo = new THREE.Group();
    pivo.name = `pivo_${i}`;
    /* Cada órbita entra com a própria fase, senão os sete nascem alinhados
       numa fileira, que é a única disposição que um sistema solar nunca tem. */
    pivo.rotation.y = i * 1.37;
    sistema.add(pivo);

    if (i === ORBITA_DA_ILHA) {
      /* A casa da ilha fica vazia aqui: quem a põe dentro é o componente, que
         é quem tem a ilha. */
      const casa = new THREE.Group();
      casa.name = "casa_da_ilha";
      casa.position.set(raio, 0, 0);
      pivo.add(casa);
      return;
    }

    const p = PLANETAS[i < ORBITA_DA_ILHA ? i : i - 1]!;
    const corpo = new THREE.Mesh(
      new THREE.IcosahedronGeometry(p.raio * 0.42, 2),
      new THREE.MeshStandardMaterial({
        name: `sistema_${p.nome}`,
        color: p.cor,
        roughness: 0.9,
        metalness: 0,
        emissive: p.cor,
        emissiveIntensity: escuro ? 0.3 : 0.08,
        flatShading: true,
      }),
    );
    corpo.name = `sistema_${p.nome}`;
    corpo.position.set(raio, 0, 0);
    pivo.add(corpo);

    if (p.anel) {
      const anel = new THREE.Mesh(
        new THREE.RingGeometry(p.raio * 0.63, p.raio * 0.97, 40),
        new THREE.MeshBasicMaterial({
          color: 0xd8b48a,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      anel.rotation.set(-1.1, 0.4, 0.2);
      corpo.add(anel);
    }
  });

  sistema.traverse((no) => {
    no.castShadow = false;
    no.receiveShadow = false;
  });
  return sistema;
}

/**
 * O sistema anda: cada órbita no seu passo, e a rolagem adianta o relógio.
 *
 * `progresso` (0 no topo da página, 1 no fim) entra somado ao tempo, com peso
 * grande: descer a página é atravessar meses do sistema. É o que faz a
 * rolagem MOVER alguma coisa em vez de só existir enquanto o fundo gira no
 * ritmo dele.
 *
 * O período cresce com o raio, como manda a terceira lei de Kepler — não é a
 * potência certa (seria 1,5), e sim 1,1, porque com a de verdade os de fora
 * ficariam parados na escala de tempo de quem lê uma página.
 */
export function moverSistema(
  sistema: THREE.Object3D,
  tempo: number,
  progresso: number,
) {
  const relogio = tempo + progresso * 240;
  ORBITAS.forEach((raio, i) => {
    const pivo = sistema.getObjectByName(`pivo_${i}`);
    if (!pivo) return;
    const periodo = 70 * Math.pow(raio / ORBITAS[0]!, 1.1);
    pivo.rotation.y = i * 1.37 + (relogio * 2 * Math.PI) / periodo;
  });

  /* A ilha gira sobre o próprio eixo enquanto percorre a órbita, como faz um
     planeta — e é esse giro que mostra a sala de todos os lados. Vive aqui, e
     não no componente, porque o compilador do React barra escrever em objeto
     que veio de um hook. */
  const casa = sistema.getObjectByName("casa_da_ilha");
  const ilha = casa?.children[0];
  if (ilha) ilha.rotation.y = tempo * 0.06 + progresso * 3;
}

/**
 * Põe a ilha na terceira órbita, no tamanho em que ela é desenhada ali.
 *
 * O sistema deixa a casa vazia porque não conhece a ilha; quem tem as duas é
 * quem monta a cena. Devolve a função que tira, para a ilha não ficar presa a
 * um sistema que já foi descartado.
 */
export function encaixarIlhaNoSistema(
  sistema: THREE.Object3D,
  ilha: THREE.Object3D,
  escala: number,
) {
  const casa = sistema.getObjectByName("casa_da_ilha");
  ilha.scale.setScalar(escala);
  casa?.add(ilha);
  return () => {
    casa?.remove(ilha);
  };
}
