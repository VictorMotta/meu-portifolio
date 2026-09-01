import * as THREE from "three";

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
 * Cor por vértice, e não um material por tom: três materiais seriam três
 * chamadas de desenho e três nuvens sobrepostas. O tamanho varia por estrela
 * pelo mesmo motivo de sempre — céu com todas as estrelas do mesmo tamanho
 * parece grade, não céu.
 */
function campoDeEstrelas() {
  const aleatorio = sorteio(0x51A17A);
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
  { nome: "planeta_azul",     volta: -3.9, elevacao:  0.012, dist: 74, raio: 3.4, cor: 0x3f6ea8, anel: false },
  { nome: "planeta_ocre",     volta:  1.1, elevacao: -0.10,  dist: 58, raio: 4.6, cor: 0xb07a4a, anel: true },
  { nome: "planeta_pequeno",  volta:  2.9, elevacao:  0.02,  dist: 88, raio: 2.2, cor: 0x8a6f9e, anel: false },
  { nome: "planeta_gelo",     volta: -0.5, elevacao: -0.34,  dist: 66, raio: 2.6, cor: 0x9fc4cf, anel: false },
  { nome: "planeta_rubro",    volta:  0.3, elevacao: -0.62,  dist: 78, raio: 3.6, cor: 0xa8523f, anel: false },
  { nome: "planeta_verde",    volta: -1.4, elevacao: -0.24,  dist: 52, raio: 1.8, cor: 0x4f8f72, anel: false },
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
    const corpo = new THREE.Mesh(new THREE.IcosahedronGeometry(p.raio, 2), material);
    corpo.name = p.nome;
    corpo.position.copy(noCeu(p.volta, p.elevacao, p.dist));
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

  const aleatorio = sorteio(0x1A2B3C);
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
const ELEVACAO_DO_CEU = 0.028;
const DISTANCIA_DO_CEU = 62;

function noCeu(volta: number, elevacao = ELEVACAO_DO_CEU, distancia = DISTANCIA_DO_CEU) {
  const horizontal = Math.cos(elevacao) * distancia;
  return new THREE.Vector3(
    Math.sin(volta) * horizontal,
    Math.sin(elevacao) * distancia,
    Math.cos(volta) * horizontal,
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
  grupo.position.copy(noCeu(OLHAR_INICIAL));

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
  grupo.position.copy(noCeu(OLHAR_INICIAL));

  /* Dourado, e não o creme quase branco que era antes: o fundo do tema claro é
     quase branco, e um sol pálido nele simplesmente não existe. `MeshBasic`
     porque o Sol não é iluminado por nada — ele É a luz. */
  const corpo = new THREE.Mesh(
    new THREE.SphereGeometry(4.2, 40, 28),
    new THREE.MeshBasicMaterial({ name: "sol_corpo", color: 0xffc23f }),
  );
  corpo.name = "sol_corpo";
  grupo.add(corpo);

  const brilho = halo("rgba(255,186,74,0.85)", 30, "sol_halo");
  if (brilho) grupo.add(brilho);
  return grupo;
}

export function construirCeu(): THREE.Group {
  const ceu = new THREE.Group();
  ceu.name = "ceu";
  ceu.add(campoDeEstrelas());
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
  if (estrelas) {
    const material = estrelas.material as THREE.ShaderMaterial;
    material.uniforms.opacidade!.value = escuro ? 1 : 0.5;
    material.uniforms.escala!.value = escuro ? 1 : 0.8;
    /* No claro a soma clareia o que já é claro e a estrela some: somar luz
       sobre um fundo quase branco não muda nada. A mistura normal é a única
       que escurece, e é ela que faz a constelação aparecer de dia. */
    material.blending = escuro ? THREE.AdditiveBlending : THREE.NormalBlending;
    material.needsUpdate = true;
  }

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
    const malha = no as THREE.Mesh & { material?: THREE.Material | THREE.Material[] };
    if (malha.geometry) malha.geometry.dispose();
    const materiais = Array.isArray(malha.material)
      ? malha.material
      : malha.material
        ? [malha.material]
        : [];
    for (const material of materiais) {
      const comMapa = material as THREE.MeshStandardMaterial & { map?: THREE.Texture | null };
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
    const materiais = Array.isArray(malha.material) ? malha.material : [malha.material];
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
