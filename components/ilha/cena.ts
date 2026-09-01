import * as THREE from "three";

/**
 * A altura em que a madeira do piso termina — e, portanto, a altura em que
 * tudo o que fica no chão da ilha se apoia.
 *
 * Mora aqui, e não em `modelos.ts`, porque quem decide é a tábua: é a soma do
 * ponto em que ela começa com a espessura dela. Já esteve escrito à mão nos
 * dois arquivos, e foi assim que as estantes acabaram enterradas no piso.
 */
export const TOPO_DAS_TABUAS = 0.0365;
const ESPESSURA_DA_TABUA = 0.035;

/**
 * A ilha do escritório.
 *
 * Geometria vinda de um projeto do Claude Design. O original era acoplado a um
 * visualizador (<three-d-stage>) que trazia órbita e barra de exportação; aqui
 * a cena virou uma função pura que devolve o grupo, e quem monta cuida de
 * câmera e luz. Assim ela cabe no React Three Fiber e nos pontos de zoom.
 *
 * NÃO reescrever à mão: se a ilha mudar no Design, exporte de novo e refaça o
 * corte do acoplamento (o resto do arquivo é geometria e não deve ser tocado).
 */
/**
 * O que é ESTRUTURA da ilha, e não mobília.
 *
 * O casco, o piso, o friso, as pedras e o domo. São peças desenhadas à mão que
 * ficam para sempre — nenhum `.glb` as substitui —, e por isso são as únicas
 * que podem aparecer antes de os modelos chegarem.
 *
 * Serve para `mostrarMobilia`, logo abaixo.
 */
function ehEstrutura(nome: string) {
  return (
    nome.startsWith("island_") ||
    nome.startsWith("floor_") ||
    nome.startsWith("rock_chunk_") ||
    nome.startsWith("floating_rock_") ||
    nome === "domo"
  );
}

/**
 * Esconde (ou devolve) tudo que não é estrutura.
 *
 * Isto existe por causa dos primeiros segundos. A ilha desenhada à mão é a
 * ilha de verdade em miniatura: sofá de caixas, monitores de retângulos,
 * plantas de bolas. Ela nasceu como o que se via enquanto os 50 MB de `.glb`
 * desciam — melhor algo do que nada, era o raciocínio.
 *
 * Só que "algo" aqui é uma sala de blocos quadriculados, e numa internet lenta
 * ela fica na tela tempo suficiente para ser a primeira impressão do
 * portfólio. Com o casco de ferro e o domo prontos, a ilha VAZIA já é uma
 * imagem acabada: um planeta sob a cúpula, esperando. É bem melhor primeira
 * impressão que móveis de papelão.
 *
 * A busca é só nos filhos diretos e nos netos: mobília é grupo (`work_zone`,
 * `whiteboard`, `office_plant_1`) ou peça solta do `island`, e esconder o grupo
 * já esconde o que está dentro.
 *
 * `naoDevolver` é o que salva de um bug que existiu: esconder o GRUPO não apaga
 * a marca de quem está dentro dele, então as peças que um modelo substituiu
 * continuam escondidas quando o grupo reaparece. Mas as peças SOLTAS no
 * `island` — a lixeira e o papel amassado — são tocadas uma a uma, e devolver
 * a visibilidade a elas desfazia a substituição: a lixeira desenhada voltava
 * para dentro da lixeira modelada, com a bola de papel branca aparecendo pela
 * grade. Quem passa o conjunto é quem conhece os encaixes.
 */
export function mostrarMobilia(
  ilha: THREE.Object3D,
  visivel: boolean,
  naoDevolver?: ReadonlySet<string>,
) {
  const pode = (nome: string) => !visivel || !naoDevolver?.has(nome);
  for (const zona of ilha.children) {
    if (zona.name === "island") {
      for (const peca of zona.children) {
        if (ehEstrutura(peca.name) || !pode(peca.name)) continue;
        peca.visible = visivel;
      }
      continue;
    }
    if (pode(zona.name)) zona.visible = visivel;
  }
}

export function construirIlha(): THREE.Group {
  const model = new THREE.Group();
  model.name = "ilha";

  type OpcoesMat = {
    roughness?: number;
    metalness?: number;
    flat?: boolean;
    emissive?: number;
    emissiveIntensity?: number;
  };
  type Vetor3 = [number, number, number];

  const mat = (name: string, color: number, o: OpcoesMat = {}) =>
    new THREE.MeshStandardMaterial({
    name, color, roughness: o.roughness ?? 0.85, metalness: o.metalness ?? 0,
    flatShading: o.flat ?? false, emissive: o.emissive ?? 0x000000, emissiveIntensity: o.emissiveIntensity ?? 1,
  });

  /* A ilha é de ferro. O que segura o deck não é pedra: é um casco forjado,
     e o facetado que já existia passa a trabalhar a favor — metal batido tem
     face, pedra tem grão. `metalness` alto com `roughness` médio é o que
     separa ferro de espelho; abaixo de 0,3 de aspereza o casco viraria cromo
     e refletiria uma cena que não existe (não há mapa de ambiente aqui), o
     que em três.js resolve para preto chapado.

     Os quatro tons continuam sendo a mesma família azul-noite de antes, um
     degrau mais claros: metal escuro sem reflexo para acompanhar some, e o
     casco é a silhueta da ilha contra o céu. */
  const M = {
    snow:     mat('ironRim',   0x3d485e, { roughness: 0.42, metalness: 0.9 }),
    crust:    mat('ironCrust', 0x2b3346, { roughness: 0.46, metalness: 0.9, flat: true }),
    rock:     mat('ironHull',  0x222a3c, { roughness: 0.5,  metalness: 0.92, flat: true }),
    rockDark: mat('ironDeep',  0x171d2b, { roughness: 0.55, metalness: 0.92, flat: true }),
    pine:     mat('plantGreen', 0x2c5c46),
    pineDark: mat('plantGreenDeep', 0x1e4433),
    trunk:    mat('trunkDark', 0x2b2621),
    wood:     mat('deskNavy', 0x323c53),
    woodDark: mat('deskNavyDeep', 0x222a3b),
    fabric:   mat('fabricMidnight', 0x28324a),
    fabricLt: mat('fabricSteel', 0x364460),
    rug:      mat('rugDeepTeal', 0x1f3a45),
    shell:    mat('shellBlack', 0x14171f, { roughness: 0.5 }),
    shellLt:  mat('shellGraphite', 0x39404f, { roughness: 0.45 }),
    metal:    mat('metalSteel', 0x8d95a8, { roughness: 0.35, metalness: 0.3 }),
    /* O friso da borda do deck. Material próprio, e não o `shellLt` que ele
       usava: aquele é o cinza de carcaça, compartilhado com a cômoda, o
       arquivo e o bebedouro — dar metal a ele viraria a sala inteira de
       alumínio. Aqui o friso é o acabamento do casco de ferro, então ele
       acompanha o casco e não os móveis. */
    friso:    mat('ironTrim', 0x4a5670, { roughness: 0.34, metalness: 0.95 }),
    screen:   mat('screenCyan', 0x0e2a38, { emissive: 0x35c8f0, emissiveIntensity: 1.5, roughness: 0.2 }),
    screenTv: mat('screenBlue', 0x121a34, { emissive: 0x3b6ef5, emissiveIntensity: 1.3, roughness: 0.2 }),
    neon:     mat('neonBlue', 0x14224a, { emissive: 0x2f6bff, emissiveIntensity: 1.6, roughness: 0.3 }),
    accent:   mat('accentTeal', 0x1d8fa8, { roughness: 0.5 }),
    cream:    mat('paperCool', 0xa8b3c6, { roughness: 0.8 }),
    bulb:     mat('bulbWarm', 0xffe6bf, { emissive: 0xffc27a, emissiveIntensity: 2.4, roughness: 0.4 }),
  };
  
  model.name = 'gamer_office_island';

  function part(
    name: string,
    geo: THREE.BufferGeometry,
    material: THREE.Material,
    pos: Vetor3 = [0, 0, 0],
    rot: Vetor3 = [0, 0, 0],
    parent: THREE.Object3D = model,
  ) {
    const m = new THREE.Mesh(geo, material);
    m.name = name;
    m.position.set(...pos);
    m.rotation.set(...rot);
    /* Sombra em tudo: é o que dá peso à ilha flutuando no escuro. */
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  const group = (name: string, parent: THREE.Object3D = model) => {
    const g = new THREE.Group();
    g.name = name;
    parent.add(g);
    return g;
  };
  const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
  const cyl = (rt: number, rb: number, h: number, s = 32, hs = 1) =>
    new THREE.CylinderGeometry(rt, rb, h, s, hs);

  /* ---------- ilha low-poly ---------- */
  const island = group('island');
  const R = 4.15, SEG = 14, ROT = Math.PI / SEG;

  /* 0,25 de altura, e não 0,22: em 0,22 a base ficava em -0,22 e o topo da
     crosta em -0,25, no MESMO raio de 4,067 — um anel de 3 cm de nada dando a
     volta na ilha, por onde se via o outro lado. O vão sempre esteve lá; o
     ferro e o tema claro é que o revelaram. */
  part('island_top', cyl(R, R * 0.98, 0.25, SEG), M.snow, [0, -0.125, 0], [0, ROT, 0], island);
  part('island_crust', cyl(R * 0.98, R * 0.86, 0.34, SEG), M.crust, [0, -0.42, 0], [0, ROT, 0], island);

  /* O fundo é uma calota, e não mais o funil de dois troncos de cone com a
     ponta embaixo. Uma ilha voadora de pedra termina em ponta; um casco de
     ferro termina redondo, como casco de navio ou de sonda — e é a mesma
     leitura que faz a coisa parecer um planeta em vez de um pedaço arrancado
     do chão.

     Meia esfera de verdade desceria os 3,57 do raio; o 0,82 no Y a achata
     para 2,93, que é perto do que o funil ocupava. Sem isso a ilha fica com
     uma barriga funda demais e o enquadramento da vista geral a encolhe para
     caber. As 14 faces são as mesmas do deck, então as arestas de cima e de
     baixo se alinham em vez de brigar. */
  const calota = new THREE.SphereGeometry(R * 0.86, SEG, 7, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  calota.scale(1, 0.82, 1);
  /* Giro ZERO, e não o `ROT` das outras peças. Não é descuido: `CylinderGeometry`
     põe o primeiro vértice a 90° e `SphereGeometry` a 180°, e 90° são 3,5 dos
     14 segmentos — meio passo. Com o mesmo `ROT` das outras, as facetas da
     calota caíam 12,9° fora das da crosta: os dois anéis tinham o mesmo raio
     (3,569) e a mesma altura (−0,59), mas os vértices de uma ficavam no meio
     das arestas da outra, e sobravam fendas triangulares por onde se via o
     outro lado da ilha. */
  const fundo = part('island_bowl', calota, M.rock, [0, -0.59, 0], [0, 0, 0], island);
  fundo.name = 'island_bowl';

  // blocos de rocha salientes
  ([[2.0, -1.0, 1.3, 0.5], [-2.1, -1.35, 0.8, 0.42], [0.5, -1.7, -2.0, 0.46],
   [-1.1, -2.3, -1.0, 0.36], [2.0, -0.75, -1.3, 0.4], [1.4, -2.6, 0.5, 0.3]] as [number, number, number, number][]).forEach(([x, y, z, r], i) => {
    const m = part(`rock_chunk_${i + 1}`, new THREE.DodecahedronGeometry(r, 0), i % 2 ? M.rock : M.rockDark, [x, y, z], [i, i * 0.8, i * 0.4], island);
    m.scale.set(1, 0.75, 1.05);
  });
  /* Rochas flutuantes: elas ORBITAM a ilha, e não ficam paradas ao lado dela.
     A posição escrita aqui é onde cada uma COMEÇA; o raio, o ângulo e a altura
     saem dela e ficam guardados em `userData.orbita`, que é o que `orbitas.ts`
     lê a cada quadro. Guardar aqui, e não lá, porque quem sabe onde a pedra
     nasce é quem a põe na cena.

     As velocidades são diferentes e não são múltiplas umas das outras: com o
     mesmo período, as quatro andariam em formação, como um carrossel. Quanto
     mais longe, mais devagar — não é a lei de Kepler de verdade, mas é o
     bastante para o olho ler "órbita" em vez de "peças girando juntas". */
  ([[3.7, -1.7, -0.9, 0.34], [-3.4, -2.9, 1.3, 0.26], [1.3, -4.6, 1.1, 0.3], [-2.4, -4.2, -1.6, 0.22]] as [number, number, number, number][]).forEach(([x, y, z, r], i) => {
    const m = part(`floating_rock_${i + 1}`, new THREE.DodecahedronGeometry(r, 0), M.rock, [x, y, z], [i, i * 1.3, i], island);
    m.scale.set(1, 0.7, 1);
    const raio = Math.hypot(x, z);
    m.userData.orbita = {
      raio,
      angulo: Math.atan2(z, x),
      altura: y,
      /* Rad/s. O 1,15 divide o passo entre as quatro sem que duas coincidam. */
      velocidade: (0.19 / Math.sqrt(raio)) * (1 + i * 0.15) * (i % 2 ? -1 : 1),
      /* Um giro próprio, para a pedra não passear sempre com a mesma face. */
      giro: 0.12 + i * 0.05,
    };
  });
  // piso de tábuas
  /* O piso na madeira que as estantes tinham: 0x563622 é a cor média daquela
     textura, e a segunda tábua é a mesma um tom abaixo, para as fileiras
     continuarem se distinguindo uma da outra.
     Estes números NÃO são a cor final. O veio da madeira entra por cima, mais
     tarde, em `amadeirarPiso` — a textura vive dentro de um .glb e aqui ainda
     não chegou —, e a cor multiplica esse desenho em vez de substituí-lo. Por
     isso os dois tons são bem mais claros do que o chão que se vê: o pixel
     médio da textura é #a47c59, e ele corta quase pela metade o que se pede
     aqui. */
  const floorMats = [mat('floorPlankA', 0x867b71, { roughness: 0.55 }), mat('floorPlankB', 0x71665f, { roughness: 0.6 })];
  const FR = 3.78, PW = 0.44;
  /* A folga em volta de cada tábua. É ela que desenha as frestas. */
  const FRESTA = 0.01;
  /* Quantos pontos desenham a curva de uma ponta. */
  const CURVA = 6;
  /* Tábua mais fina que isto não é tábua: vira uma lasca do tamanho da fresta. */
  const FINA = 0.02;

  /**
   * Uma tábua recortada no círculo do piso.
   *
   * O retângulo cru é [xa..xb] x [z0..z1]; o que sai é a parte dele que cabe
   * dentro do círculo, medida z a z. Nas tábuas do meio isso não muda nada;
   * nas das pontas, troca o canto reto por um arco.
   *
   * Era o canto reto que dava os dois defeitos de uma vez. A largura da
   * fileira vinha do z do MEIO dela, e a fileira é larga: na borda de fora, o
   * círculo já é mais estreito ali do que no meio, e o canto passava para fora
   * do aro. Ao mesmo tempo o retângulo não alcançava o arco entre um canto e
   * outro, e sobrava um vão contra o aro.
   */
  function tabua(xa: number, xb: number, z0: number, z1: number) {
    /* O que sobra do retângulo cru neste z, depois do corte do círculo. */
    const largura = (z: number) => {
      const borda = Math.sqrt(Math.max(FR * FR - z * z, 0)) - FRESTA;
      return Math.min(xb, borda) - Math.max(xa, -borda);
    };
    /* O z em que esta tábua é mais larga: o ponto da fileira mais perto do
       meio do piso. Dali para as duas pontas ela só afina — o círculo é
       convexo —, e é isso que faz a bisseção abaixo funcionar. */
    const cheio = z0 * z1 <= 0 ? 0 : Math.abs(z0) < Math.abs(z1) ? z0 : z1;
    if (largura(cheio) < FINA) return null;

    /* Onde a tábua afina até sumir, procurado por bisseção em vez de sair do
       passo fixo da amostragem.
       O passo fixo era o que deixava a lasca de piso à mostra no topo e na
       base do círculo: lá a fileira corre rente ao aro, o último ponto do
       passo já caía fora do círculo e era descartado, e a tábua terminava
       reta no ponto ANTERIOR — a calota entre ele e o aro ficava sem madeira.
       Achando a ponta de verdade, o último ponto pousa nela. */
    const ponta = (fora: number) => {
      if (largura(fora) >= FINA) return fora;
      let dentro = cheio, longe = fora;
      for (let n = 0; n < 24; n++) {
        const m = (dentro + longe) / 2;
        if (largura(m) >= FINA) dentro = m;
        else longe = m;
      }
      return dentro;
    };
    const za = ponta(z0), zb = ponta(z1);
    if (zb - za < 1e-4) return null;

    const direita: THREE.Vector2[] = [];
    const esquerda: THREE.Vector2[] = [];
    for (let k = 0; k <= CURVA; k++) {
      const z = za + ((zb - za) * k) / CURVA;
      const borda = Math.sqrt(Math.max(FR * FR - z * z, 0)) - FRESTA;
      /* O Z entra negado: a rotação que deita a forma no chão é a mesma que
         mantém as faces viradas para cima, e ela espelha o eixo. */
      direita.push(new THREE.Vector2(Math.min(xb, borda), -z));
      esquerda.push(new THREE.Vector2(Math.max(xa, -borda), -z));
    }
    const forma = new THREE.Shape([...direita, ...esquerda.reverse()]);
    const geo = new THREE.ExtrudeGeometry(forma, { depth: ESPESSURA_DA_TABUA, bevelEnabled: false });
    /* A forma nasce em pé no XY; deitada, a espessura passa a sair do chão
       para cima, de y=0 a y=0,035. O deslocamento é o que põe a tábua na
       altura da caixa que ela substituiu: de 0,0015 a 0,0365.
       O 0,0365 é o topo, e ele NÃO é opcional — é o `TOPO_DAS_TABUAS` de
       `modelos.ts`, a altura em que os móveis se apoiam. Deslocar a tábua
       pelo topo em vez de pela base levanta o piso 3,5 cm e enterra no chão
       tudo o que estiver em cima dele. */
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, TOPO_DAS_TABUAS - ESPESSURA_DA_TABUA, 0);
    return geo;
  }

  /* As fileiras cobrem de -3,96 a 3,96, mais do que o círculo, e o recorte se
     encarrega do resto. Contando só as que cabiam inteiras sobrava uma faixa
     sem tábua num dos lados. */
  const rows = Math.ceil((FR * 2) / PW);
  for (let i = 0; i < rows; i++) {
    const z0 = -(rows * PW) / 2 + i * PW + FRESTA;
    const z1 = z0 + PW - 2 * FRESTA;
    /* O corte em pedaços continua saindo da largura no meio da fileira: ele
       decide só onde ficam as emendas, e o recorte vem depois. */
    const meio = (z0 + z1) / 2;
    const half = Math.sqrt(Math.max(FR * FR - meio * meio, 0));
    if (half < 0.15) continue;
    const segs = Math.max(1, Math.round((half * 2) / 1.6));
    const segW = (half * 2) / segs;
    for (let j = 0; j < segs; j++) {
      /* As duas pontas da fileira correm para fora do círculo de propósito, e
         quem as encurta é o recorte. Pará-las em `half` deixava justamente o
         vão que o recorte veio fechar: `half` é a largura no MEIO da fileira,
         e na borda de dentro dela o círculo já é bem mais largo — 0,80 a mais
         na fileira da ponta. Só as emendas de dentro saem de `half`. */
      const xa = j === 0 ? -FR - PW : -half + j * segW + FRESTA;
      const xb = j === segs - 1 ? FR + PW : -half + (j + 1) * segW - FRESTA;
      const geo = tabua(xa, xb, z0, z1);
      if (!geo) continue;
      part(`floor_plank_${i + 1}_${j + 1}`, geo, floorMats[(i + j) % 2]!, [0, 0, 0], [0, 0, 0], island);
    }
  }
  part('floor_trim', new THREE.TorusGeometry(FR + 0.05, 0.05, 12, 64), M.friso, [0, 0.03, 0], [Math.PI / 2, 0, 0], island);

  // vaso de planta de interior
  function officePlant(
    name: string,
    x: number,
    z: number,
    s: number,
    parent: THREE.Object3D,
  ) {
    const g = group(name, parent);
    g.position.set(x, 0, z); g.scale.setScalar(s); g.rotation.y = (x + z) % 1.5;
    part(`${name}_pot`, cyl(0.19, 0.15, 0.34, 8), M.cream, [0, 0.17, 0], [0, 0, 0], g);
    part(`${name}_pot_rim`, cyl(0.21, 0.2, 0.05, 8), M.accent, [0, 0.35, 0], [0, 0, 0], g);
    part(`${name}_stem`, cyl(0.025, 0.035, 0.7, 6), M.trunk, [0, 0.65, 0], [0, 0, 0], g);
    ([[0, 0.95, 0, 0.3], [0.16, 1.16, 0.05, 0.22], [-0.14, 1.1, -0.08, 0.19], [0.03, 1.34, -0.04, 0.15]] as [number, number, number, number][]).forEach(([lx, ly, lz, r], i) => {
      const f = part(`${name}_leaf_${i + 1}`, new THREE.IcosahedronGeometry(r, 2), i % 2 ? M.pineDark : M.pine, [lx, ly, lz], [i, i * 0.7, i * 0.4], g);
      f.scale.set(1, 0.8, 1);
    });
    return g;
  }
  /* A árvore andou junto com a cômoda, para o outro lado: as duas dividiam o
     mesmo canto e a copa entrava dentro do móvel. Agora sobram 5 cm entre a
     copa e a quina da cômoda, e 8 cm entre ela e o vaso da mesa de trabalho.
     Ver também o tamanho, em `PLANTA_1`. */
  officePlant('office_plant_1', -2.66, 2.12, 1.0, island);
  /* Trocou de lugar com o Sonic: o vaso foi para o canto onde estavam as
     caixas e o boneco ficou com o canto do vaso, de frente para a mesa de
     centro. O vaso é mais largo que o boneco, então a quina de fora avança de
     3,61 para 3,66 — ainda dentro das tábuas, que acabam em 3,78. O giro sai
     da posição (`(x + z) % 1.5`), então muda sozinho junto — e planta não tem
     frente, tanto faz para onde ela olha. */
  officePlant('office_plant_2', 1.1, 3.15, 0.85, island);
  officePlant('office_plant_3', -3.2, -0.5, 0.75, island);

  // quadro branco
  const wb = group('whiteboard', island);
  /* Puxada 20 cm para dentro pelo raio. Em (-2,05; -2,35) a quina do quadro
     chegava a 3,90 do centro — o piso de tábuas acaba em 3,78 e o friso em
     3,88, então ele passava dos dois e ficava pendurado para fora da ilha.
     Aqui a quina cai para 3,70. Foi por essa direção e não por um eixo só
     porque é a radial que decide se a peça está dentro do deck; de quebra ela
     afasta o quadro da beirada sem o aproximar da mesa nem do quadro de
     projetos, que são os dois vizinhos. */
  wb.position.set(-1.92, 0, -2.2); wb.rotation.y = 0.85; wb.scale.setScalar(0.85);
  part('whiteboard_panel', box(0.07, 1.0, 1.7), M.cream, [0, 1.0, 0], [0, 0, 0], wb);
  part('whiteboard_frame', box(0.05, 1.06, 1.76), M.metal, [-0.02, 1.0, 0], [0, 0, 0], wb);
  /* Os rabiscos viraram texto de verdade: ver `texturas.ts`. */
  part('whiteboard_tray', box(0.14, 0.05, 1.6), M.metal, [0.06, 0.48, 0], [0, 0, 0], wb);
  ([[-0.4], [0.3]] as [number][]).forEach(([z], i) => part(`whiteboard_leg_${i + 1}`, cyl(0.035, 0.035, 0.5, 6), M.metal, [0, 0.25, z], [0, 0, 0], wb));
  ([[-0.4], [0.3]] as [number][]).forEach(([z], i) => part(`whiteboard_foot_${i + 1}`, box(0.5, 0.05, 0.08), M.metal, [0, 0.02, z], [0, 0, 0], wb));

  // arquivo de gavetas
  const fc = group('filing_cabinet', island);
  /* Puxada 30 cm para dentro pelo raio. Em (-1,9; 2,7) o canto de fora da
     cômoda chegava a 3,85 do centro, e o piso de tábuas acaba em 3,78: ela
     ficava com a quina em cima do friso, pendurada na beirada. Aqui o canto
     cai para 3,55, com 23 cm de tábua sobrando por fora. */
  fc.position.set(-1.73, 0, 2.46); fc.rotation.y = -0.35;
  part('cabinet_body', box(0.5, 0.8, 0.7), M.shellLt, [0, 0.4, 0], [0, 0, 0], fc);
  for (let i = 0; i < 3; i++) {
    part(`cabinet_drawer_${i + 1}`, box(0.03, 0.22, 0.62), M.metal, [0.255, 0.18 + i * 0.25, 0], [0, 0, 0], fc);
    part(`cabinet_handle_${i + 1}`, box(0.04, 0.03, 0.24), M.shell, [0.28, 0.18 + i * 0.25, 0], [0, 0, 0], fc);
  }
  part('cabinet_folder_stack', box(0.3, 0.09, 0.42), M.accent, [0, 0.845, 0.05], [0, 0.2, 0], fc);
  part('cabinet_folder_stack_2', box(0.28, 0.06, 0.38), M.cream, [0.02, 0.92, 0.02], [0, -0.15, 0], fc);

  // bebedouro
  const wc = group('water_cooler', island);
  wc.position.set(3.3, 0, -1.0);
  part('cooler_body', box(0.42, 0.95, 0.42), M.shellLt, [0, 0.475, 0], [0, 0, 0], wc);
  part('cooler_bottle', cyl(0.15, 0.19, 0.45, 10), M.screen, [0, 1.2, 0], [0, 0, 0], wc);
  part('cooler_bottle_neck', cyl(0.09, 0.13, 0.12, 8), M.screen, [0, 0.98, 0], [0, 0, 0], wc);
  part('cooler_tap', box(0.09, 0.06, 0.1), M.accent, [-0.22, 0.62, 0], [0, 0, 0], wc);
  part('cooler_tray', box(0.12, 0.04, 0.24), M.shell, [-0.24, 0.42, 0], [0, 0, 0], wc);

  // caixas de papelão empilhadas
  const bx = group('boxes', island);
  /* O canto que era do vaso de folhas. Os dois têm quase a mesma pegada, então
     a quina de fora praticamente não muda: 3,69 com o vaso, 3,69 com o boneco,
     e o piso de tábuas acaba em 3,78. Ver o giro em `SONIC`, que é o que o vira
     para a mesa. */
  bx.position.set(2.55, 0, 2.2);
  part('box_1', box(0.6, 0.42, 0.6), M.wood, [0, 0.21, 0], [0, 0.25, 0], bx);
  part('box_2', box(0.5, 0.36, 0.5), M.woodDark, [0.05, 0.6, 0.04], [0, -0.4, 0], bx);
  part('box_tape_1', box(0.62, 0.05, 0.14), M.cream, [0, 0.42, 0], [0, 0.25, 0], bx);

  // cesto de lixo
  part('trash_bin', cyl(0.15, 0.12, 0.34, 8), M.metal, [-0.85, 0.17, -2.35], [0, 0.3, 0], island);
  part('trash_paper', new THREE.IcosahedronGeometry(0.08, 1), M.cream, [-0.85, 0.36, -2.35], [1, 0.5, 0.3], island);

  // quadro de projetos (kanban)
  const kb = group('project_board', island);
  kb.position.set(0.35, 0, -3.05); kb.rotation.y = 0.12;
  part('project_board_panel', box(2.0, 1.15, 0.07), M.cream, [0, 1.35, 0], [0, 0, 0], kb);
  part('project_board_frame', box(2.08, 1.23, 0.05), M.woodDark, [0, 1.35, -0.02], [0, 0, 0], kb);
  part('project_board_header', box(1.9, 0.12, 0.02), M.neon, [0, 1.8, 0.045], [0, 0, 0], kb);
  const colMats = [M.accent, M.screen, M.pine];
  for (let c = 0; c < 3; c++) {
    part(`project_column_label_${c + 1}`, box(0.5, 0.07, 0.02), colMats[c]!, [-0.62 + c * 0.62, 1.66, 0.045], [0, 0, 0], kb);
    const n = [3, 2, 3][c]!;
    /* O painel do quadro vai de y=0.775 a y=1.925, e o rótulo da coluna ocupa
       até 1.695. Com três post-its de 0.28 espaçados de 0.36 o último ficava
       em 0.56 — pendurado no ar, abaixo da borda de baixo do quadro. */
    for (let r = 0; r < n; r++) {
      part(`project_note_${c + 1}_${r + 1}`, box(0.34, 0.22, 0.02), colMats[c]!,
        [-0.62 + c * 0.62 + ((r % 2) ? 0.03 : -0.02), 1.48 - r * 0.26, 0.045], [0, 0, (r % 2 ? -1 : 1) * 0.05], kb);
    }
  }
  ([[-0.85], [0.85]] as [number][]).forEach(([x], i) => {
    part(`project_board_leg_${i + 1}`, cyl(0.04, 0.04, 0.78, 6), M.metal, [x, 0.39, 0.02], [0, 0, 0], kb);
    part(`project_board_foot_${i + 1}`, box(0.1, 0.05, 0.5), M.metal, [x, 0.02, 0.02], [0, 0, 0], kb);
  });

  // cavalete com o currículo
  const cv = group('resume_easel', island);
  cv.position.set(-0.35, 0, 3.0); cv.rotation.y = 0.15;
  part('easel_leg_left', cyl(0.03, 0.03, 1.5, 16), M.woodDark, [-0.42, 0.72, 0.1], [0.09, 0, 0.06], cv);
  part('easel_leg_right', cyl(0.03, 0.03, 1.5, 16), M.woodDark, [0.42, 0.72, 0.1], [0.09, 0, -0.06], cv);
  part('easel_leg_back', cyl(0.03, 0.03, 1.45, 16), M.woodDark, [0, 0.7, -0.45], [-0.32, 0, 0], cv);
  part('easel_tray', box(1.0, 0.05, 0.12), M.woodDark, [0, 0.62, -0.02], [0, 0, 0], cv);
  const sheet = group('resume_face', cv);
  /* A prumo. O -0,09 daqui era a inclinação de folha apoiada num cavalete, e
     fazia sentido enquanto o cavalete era o desenhado, de pernas tortas. Com o
     .glb do quadro no lugar dele, a lousa entra reta e a folha ficava 5,2° fora
     de esquadro com ela — era o currículo torto. A perna de trás desenhada
     continua inclinada, mas ela sai da cena junto com o resto em `substitui`;
     só se vê nos primeiros quadros, antes de o modelo chegar. */
  sheet.position.set(0, 1.3, 0.06); sheet.rotation.x = 0;
  part('resume_backing', box(0.94, 1.24, 0.04), M.shellLt, [0, 0, 0], [0, 0, 0], sheet);
  part('resume_sheet', box(0.84, 1.12, 0.02), M.cream, [0, 0, 0.03], [0, 0, 0], sheet);
  /* Foto, barras e linhas viraram o currículo escrito na folha: ver
     `texturas.ts`. Mantê-las aqui só cobriria o texto. */
  part('resume_stack', box(0.3, 0.05, 0.42), M.cream, [0.3, 0.66, 0.0], [0, 0.2, 0], cv);
  part('resume_stack_top', box(0.28, 0.02, 0.4), M.metal, [0.31, 0.695, 0.01], [0, 0.12, 0], cv);

  /* ---------- estante divisória ---------- */
  const div = group('divider_shelf');
  div.position.set(0.05, 0, 0.1);
  part('divider_side_left', box(0.34, 1.15, 0.06), M.woodDark, [0, 0.575, -1.3], [0, 0, 0], div);
  part('divider_side_right', box(0.34, 1.15, 0.06), M.woodDark, [0, 0.575, 1.3], [0, 0, 0], div);
  part('divider_back', box(0.03, 1.15, 2.6), M.woodDark, [-0.15, 0.575, 0], [0, 0, 0], div);
  part('divider_mid_post', box(0.34, 1.15, 0.05), M.woodDark, [0, 0.575, 0], [0, 0, 0], div);
  for (let i = 0; i < 3; i++) part(`divider_board_${i + 1}`, box(0.34, 0.04, 2.6), M.wood, [0, 0.02 + i * 0.42, 0], [0, 0, 0], div);
  part('divider_top', box(0.38, 0.05, 2.7), M.wood, [0, 1.16, 0], [0, 0, 0], div);
  // projetos entregues: cubos etiquetados no topo da estante
  ([[-0.95, M.accent], [-0.3, M.screen], [0.35, M.neon], [1.0, M.pine]] as [number, THREE.Material][]).forEach(([z, mm], i) => {
    part(`shipped_project_${i + 1}`, box(0.24, 0.24, 0.24), mm, [0, 1.31, z], [0, i * 0.3, 0], div);
    part(`shipped_project_label_${i + 1}`, box(0.02, 0.09, 0.16), M.cream, [0.13, 1.33, z], [0, i * 0.3, 0], div);
  });
  const bookMats = [M.accent, M.cream, M.fabric, M.pine, M.neon, M.shellLt];
  for (let i = 0; i < 12; i++) {
    const h = 0.22 + ((i * 7) % 4) * 0.03;
    part(`book_${i + 1}`, box(0.16, h, 0.05 + ((i * 5) % 3) * 0.02), bookMats[i % 6]!,
      [0, 0.46 + (i < 6 ? 0 : 0.42) + h / 2, -1.05 + (i % 6) * 0.3], [0, 0, i % 4 === 3 ? 0.12 : 0], div);
  }
  model.add(div);

  /* ---------- zona de trabalho ---------- */
  const work = group('work_zone');
  work.position.set(-1.85, 0, -0.15);

  const desk = group('desk', work);
  desk.position.set(-0.45, 0, 0);
  part('desk_top', box(0.85, 0.06, 2.0), M.wood, [0, 0.73, 0], [0, 0, 0], desk);
  part('desk_edge_light', box(0.86, 0.02, 1.98), M.neon, [0, 0.695, 0], [0, 0, 0], desk);
  ([[-0.32, -0.9], [0.32, -0.9], [-0.32, 0.9], [0.32, 0.9]] as [number, number][]).forEach(([x, z], i) => {
    part(`desk_leg_${i + 1}`, cyl(0.03, 0.035, 0.7, 8), M.metal, [x, 0.35, z], [0, 0, 0], desk);
  });

  function monitor(
    name: string,
    z: number,
    w: number,
    h: number,
    tilt: number,
    parent: THREE.Object3D,
  ) {
    const g = group(name, parent);
    g.position.set(0.02, 0.79, z); g.rotation.y = tilt;
    part(`${name}_foot`, cyl(0.16, 0.18, 0.03, 8), M.shell, [0, 0.015, 0], [0, 0, 0], g);
    part(`${name}_post`, box(0.05, 0.3, 0.07), M.shell, [0, 0.17, 0], [0, 0, 0], g);
    part(`${name}_bezel`, box(0.05, h, w), M.shell, [0, 0.32 + h / 2, 0], [0, 0, 0], g);
    part(`${name}_screen`, box(0.012, h - 0.05, w - 0.05), M.screen, [0.031, 0.32 + h / 2, 0], [0, 0, 0], g);
    return g;
  }
  monitor('monitor_left', -0.56, 1.02, 0.6, 0.26, desk);
  monitor('monitor_right', 0.56, 1.02, 0.6, -0.26, desk);

  const lap = group('macbook', desk);
  lap.position.set(0.44, 0.765, 0.0); lap.rotation.y = 0;
  part('macbook_base', box(0.34, 0.018, 0.5), M.shellLt, [0, 0.009, 0], [0, 0, 0], lap);
  part('macbook_deck', box(0.3, 0.006, 0.46), M.metal, [0, 0.021, 0], [0, 0, 0], lap);
  part('macbook_keys', box(0.14, 0.005, 0.4), M.shell, [-0.05, 0.025, 0], [0, 0, 0], lap);
  part('macbook_trackpad', box(0.11, 0.004, 0.16), M.shellLt, [0.09, 0.025, 0], [0, 0, 0], lap);
  part('macbook_hinge', cyl(0.009, 0.009, 0.5, 24), M.metal, [-0.17, 0.02, 0], [Math.PI / 2, 0, 0], lap);
  part('macbook_lid', box(0.014, 0.34, 0.5), M.shellLt, [-0.217, 0.185, 0], [0, 0, 0.28], lap);
  part('macbook_screen', box(0.008, 0.29, 0.46), M.screen, [-0.206, 0.188, 0], [0, 0, 0.28], lap);
  part('macbook_notch', box(0.008, 0.02, 0.08), M.shell, [-0.25, 0.325, 0], [0, 0, 0.28], lap);
  part('macbook_foot', box(0.3, 0.006, 0.44), M.shell, [0, 0.002, 0], [0, 0, 0], lap);

  part('keyboard', box(0.16, 0.025, 0.6), M.shell, [0.5, 0.775, -0.72], [0, 0, 0], desk);
  part('keyboard_keys', box(0.13, 0.012, 0.54), M.cream, [0.5, 0.793, -0.72], [0, 0, 0], desk);
  part('keyboard_underglow', box(0.18, 0.012, 0.62), M.neon, [0.5, 0.766, -0.72], [0, 0, 0], desk);
  const mouse = part('mouse', new THREE.SphereGeometry(0.055, 24, 16), M.shell, [0.5, 0.765, 0.72], [0, 0, 0], desk);
  mouse.scale.set(0.75, 0.55, 1.1);

  const mug = group('mug', desk);
  mug.position.set(0.16, 0.76, -0.95);
  part('mug_body', cyl(0.055, 0.048, 0.11, 10), M.accent, [0, 0.055, 0], [0, 0, 0], mug);
  part('mug_handle', new THREE.TorusGeometry(0.035, 0.011, 14, 32), M.accent, [0.06, 0.06, 0], [0, Math.PI / 2, 0], mug);
  part('coffee', cyl(0.045, 0.045, 0.01, 10), M.woodDark, [0, 0.105, 0], [0, 0, 0], mug);

  const lamp = group('desk_lamp', desk);
  lamp.position.set(0.02, 0.76, 0.92);
  part('lamp_base', cyl(0.09, 0.1, 0.03, 8), M.shell, [0, 0.015, 0], [0, 0, 0], lamp);
  part('lamp_arm', cyl(0.015, 0.015, 0.5, 6), M.shell, [0.04, 0.26, -0.03], [0.15, 0, -0.16], lamp);
  part('lamp_head', new THREE.ConeGeometry(0.11, 0.14, 32, 1, true), M.accent, [0.13, 0.5, -0.1], [0.5, 0, -0.6], lamp);
  part('lamp_bulb', new THREE.SphereGeometry(0.04, 20, 14), M.screen, [0.15, 0.45, -0.07], [0, 0, 0], lamp);

  const chair = group('gaming_chair', work);
  chair.position.set(0.55, 0, 0.05); chair.rotation.y = -1.45;
  part('chair_seat', box(0.5, 0.08, 0.5), M.shell, [0, 0.47, 0], [0, 0, 0], chair);
  part('chair_cushion', box(0.44, 0.05, 0.44), M.fabricLt, [0, 0.52, 0], [0, 0, 0], chair);
  part('chair_back', box(0.44, 0.6, 0.08), M.fabricLt, [0, 0.82, -0.22], [-0.14, 0, 0], chair);
  part('chair_back_stripe', box(0.1, 0.56, 0.03), M.accent, [0, 0.82, -0.17], [-0.14, 0, 0], chair);
  part('chair_headrest', box(0.3, 0.14, 0.07), M.shell, [0, 1.16, -0.29], [-0.14, 0, 0], chair);
  part('chair_post', cyl(0.04, 0.05, 0.4, 8), M.metal, [0, 0.24, 0], [0, 0, 0], chair);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    part(`chair_arm_${i + 1}`, box(0.05, 0.04, 0.34), M.shell, [Math.sin(a) * 0.17, 0.07, Math.cos(a) * 0.17], [0, a, 0], chair);
    part(`chair_wheel_${i + 1}`, new THREE.TorusGeometry(0.035, 0.018, 12, 24), M.shell,
      [Math.sin(a) * 0.32, 0.04, Math.cos(a) * 0.32], [0, a, Math.PI / 2], chair);
  }
  ([[-0.28], [0.28]] as [number][]).forEach(([x], i) => {
    part(`chair_armrest_${i + 1}`, box(0.06, 0.2, 0.06), M.shell, [x, 0.6, -0.05], [0, 0, 0], chair);
    part(`chair_armpad_${i + 1}`, box(0.08, 0.04, 0.28), M.shell, [x, 0.71, -0.02], [0, 0, 0], chair);
  });

  const plant = group('plant', work);
  plant.position.set(-0.5, 0, 1.5);
  part('pot', cyl(0.19, 0.14, 0.28, 8), M.accent, [0, 0.14, 0], [0, 0, 0], plant);
  part('pot_rim', new THREE.TorusGeometry(0.19, 0.022, 14, 40), M.accent, [0, 0.28, 0], [Math.PI / 2, 0, 0], plant);
  ([[0, 0.5, 0, 0.26], [0.14, 0.72, 0.06, 0.19], [-0.12, 0.66, -0.1, 0.16], [0.05, 0.88, -0.05, 0.13]] as [number, number, number, number][]).forEach(([x, y, z, r], i) => {
    const f = part(`foliage_${i + 1}`, new THREE.IcosahedronGeometry(r, 2), i % 2 ? M.pineDark : M.pine, [x, y, z], [i, i, i], plant);
    f.scale.set(1, 0.85, 1);
  });
  part('plant_stem', cyl(0.02, 0.03, 0.5, 6), M.trunk, [0, 0.45, 0], [0, 0, 0], plant);

  const pc = group('pc_tower', work);
  pc.position.set(-0.4, 0, -1.45);
  part('tower_case', box(0.32, 0.66, 0.6), M.shell, [0, 0.33, 0], [0, 0, 0], pc);
  part('tower_glass', box(0.01, 0.5, 0.44), M.neon, [0.166, 0.35, 0], [0, 0, 0], pc);
  part('tower_led', box(0.02, 0.03, 0.5), M.screen, [0.16, 0.64, 0], [0, 0, 0], pc);
  model.add(work);

  /* ---------- zona gamer ---------- */
  const hobby = group('gamer_zone');
  hobby.position.set(1.9, 0, 0.1);

  const rugMesh = part('rug', cyl(1.05, 1.05, 0.03, 8), M.rug, [0.05, 0.015, 0.15], [0, ROT, 0], hobby);
  rugMesh.scale.set(1, 1, 1.05);

  const sofa = group('sofa', hobby);
  sofa.position.set(-0.75, 0, 0.15);
  part('sofa_base', box(0.85, 0.32, 1.7), M.fabric, [0, 0.22, 0], [0, 0, 0], sofa);
  part('sofa_back', box(0.22, 0.62, 1.7), M.fabric, [-0.32, 0.55, 0], [0, 0, -0.06], sofa);
  ([[-0.78], [0.78]] as [number][]).forEach(([z], i) => part(`sofa_arm_${i + 1}`, box(0.8, 0.28, 0.2), M.fabric, [0.02, 0.5, z], [0, 0, 0], sofa));
  ([[-0.42], [0.42]] as [number][]).forEach(([z], i) => {
    part(`sofa_seat_cushion_${i + 1}`, box(0.7, 0.16, 0.72), M.fabricLt, [0.08, 0.45, z], [0, 0, 0], sofa);
    part(`sofa_back_cushion_${i + 1}`, box(0.16, 0.42, 0.7), M.fabricLt, [-0.14, 0.66, z], [0, 0, -0.1], sofa);
  });
  part('throw_pillow', box(0.12, 0.3, 0.3), M.accent, [0.02, 0.66, -0.55], [0.1, 0, -0.25], sofa);
  ([[-0.36, -0.85], [0.36, -0.85], [-0.36, 0.85], [0.36, 0.85]] as [number, number][]).forEach(([x, z], i) => {
    part(`sofa_foot_${i + 1}`, cyl(0.035, 0.03, 0.12, 6), M.woodDark, [x, 0.06, z], [0, 0, 0], sofa);
  });

  const ct = group('coffee_table', hobby);
  ct.position.set(0.15, 0, 0.15);
  part('coffee_table_top', box(0.5, 0.05, 0.95), M.wood, [0, 0.36, 0], [0, 0, 0], ct);
  ([[-0.18, -0.38], [0.18, -0.38], [-0.18, 0.38], [0.18, 0.38]] as [number, number][]).forEach(([x, z], i) => {
    part(`coffee_table_leg_${i + 1}`, cyl(0.022, 0.022, 0.36, 6), M.woodDark, [x, 0.18, z], [0, 0, 0], ct);
  });
  part('snack_bowl', cyl(0.14, 0.09, 0.09, 28), M.shellLt, [0, 0.43, -0.25], [0, 0, 0], ct);
  part('snack_bowl_inner', cyl(0.125, 0.08, 0.02, 28), M.shell, [0, 0.465, -0.25], [0, 0, 0], ct);
  part('snacks', new THREE.SphereGeometry(0.055, 20, 12), M.accent, [0, 0.475, -0.25], [0, 0, 0], ct);
  part('soda_can', cyl(0.035, 0.035, 0.13, 8), M.accent, [0.05, 0.45, 0.3], [0, 0, 0], ct);

  function pad(
    name: string,
    pos: Vetor3,
    rot: Vetor3,
    parent: THREE.Object3D,
  ) {
    const g = group(name, parent);
    g.position.set(...pos); g.rotation.set(...rot);
    const body = part(`${name}_body`, new THREE.SphereGeometry(1, 28, 18), M.shell, [0, 0, 0], [0, 0, 0], g);
    body.scale.set(0.095, 0.026, 0.052);
    [-1, 1].forEach((sgn, i) => {
      const grip = part(`${name}_grip_${i + 1}`, new THREE.CapsuleGeometry(0.026, 0.055, 8, 20), M.shell,
        [sgn * 0.075, -0.028, 0.035], [0.85, 0, sgn * 0.28], g);
      grip.scale.set(1, 1, 0.85);
      part(`${name}_bumper_${i + 1}`, new THREE.CapsuleGeometry(0.009, 0.028, 6, 12), M.shellLt,
        [sgn * 0.052, 0.014, -0.048], [0, 0, Math.PI / 2], g);
    });
    ([[-0.042, -0.012], [0.042, 0.012]] as [number, number][]).forEach(([x, z], i) => {
      part(`${name}_stick_base_${i + 1}`, cyl(0.022, 0.024, 0.012, 20), M.shellLt, [x, 0.022, z + 0.012], [0, 0, 0], g);
      part(`${name}_stick_${i + 1}`, cyl(0.016, 0.012, 0.018, 20), M.shell, [x, 0.033, z + 0.012], [0, 0, 0], g);
      part(`${name}_stick_top_${i + 1}`, new THREE.TorusGeometry(0.012, 0.005, 10, 24), M.shellLt, [x, 0.042, z + 0.012], [Math.PI / 2, 0, 0], g);
    });
    part(`${name}_dpad_h`, box(0.042, 0.008, 0.014), M.shellLt, [-0.042, 0.028, -0.028], [0, 0, 0], g);
    part(`${name}_dpad_v`, box(0.014, 0.008, 0.042), M.shellLt, [-0.042, 0.028, -0.028], [0, 0, 0], g);
    const btnMats = [M.screen, M.neon, M.accent, M.metal];
    ([[0, 0.018], [0.018, 0], [0, -0.018], [-0.018, 0]] as [number, number][]).forEach(([dx, dz], i) => {
      part(`${name}_button_${i + 1}`, cyl(0.008, 0.008, 0.008, 16), btnMats[i]!, [0.042 + dx, 0.028, -0.028 + dz], [0, 0, 0], g);
    });
    part(`${name}_home`, cyl(0.009, 0.009, 0.006, 16), M.neon, [0, 0.028, -0.01], [0, 0, 0], g);
    return g;
  }
  pad('gamepad_1', [0.02, 0.42, -0.02], [0, 0.5, 0], ct);
  pad('gamepad_2', [-0.67, 0.57, 0.55], [0, -0.9, 0.06], hobby);

  const tv = group('tv_wall', hobby);
  tv.position.set(1.22, 0, 0.15);
  part('tv_stand', box(0.42, 0.42, 1.55), M.woodDark, [0, 0.21, 0], [0, 0, 0], tv);
  part('tv_stand_top', box(0.48, 0.05, 1.62), M.wood, [0, 0.44, 0], [0, 0, 0], tv);
  part('tv_stand_shelf', box(0.4, 0.03, 1.45), M.wood, [0.01, 0.22, 0], [0, 0, 0], tv);
  part('console', box(0.3, 0.09, 0.42), M.shellLt, [-0.02, 0.28, -0.45], [0, 0, 0], tv);
  part('console_led', box(0.006, 0.012, 0.3), M.neon, [-0.174, 0.28, -0.45], [0, 0, 0], tv);
  ([[-0.05], [0.06], [0.17]] as [number][]).forEach(([z], i) => {
    part(`game_case_${i + 1}`, box(0.16, 0.19, 0.03), bookMats[(i + 2) % 6]!, [0, 0.34, z], [0, 0, i === 2 ? 0.1 : 0], tv);
  });
  /* As três medidas saem do .glb que entra no lugar delas (`TV`, em
     modelos.ts), e não de um desenho livre. A chapa do modelo vai de 0,610 a
     1,393 e o VIDRO dela, recuado por uma moldura de 4,8 cm, de 0,658 a 1,346
     por z de ±0,624.

     A `tv_screen` importa porque ela NÃO é substituída: é nela que os Mods são
     pintados e é o retângulo dela, projetado na tela, que decide onde o painel
     de HTML pousa. Enquanto ela media 0,66 x 1,36 centrada em 1,12, o painel
     saía 5,7 cm acima da TV inteira e 5,6 cm para fora da moldura de cada
     lado — era a informação escapando por cima do aparelho.

     O pescoço e a moldura são substituídos e só aparecem nos primeiros
     quadros, antes de o .glb chegar; seguem as mesmas medidas para que a troca
     não pule. */
  part('tv_neck', box(0.1, 0.08, 0.28), M.shell, [0, 0.573, 0], [0, 0, 0], tv);
  part('tv_frame', box(0.06, 0.783, 1.372), M.shell, [-0.01, 1.002, 0], [0, 0, 0], tv);
  /* Fina e recuada: a face da frente fica 4 mm à frente do vidro (x -0,032) e
     8 mm ATRÁS da moldura (x -0,044), então a moldura do aparelho continua
     emoldurando o conteúdo em vez de ficar coberta por ele. */
  part('tv_screen', box(0.006, 0.688, 1.248), M.screenTv, [-0.033, 1.002, 0], [0, 0, 0], tv);
  ([[-0.62], [0.62]] as [number][]).forEach(([z], i) => {
    part(`speaker_${i + 1}`, box(0.16, 0.5, 0.16), M.shell, [-0.02, 0.72, z], [0, 0, 0], tv);
    part(`speaker_cone_${i + 1}`, cyl(0.06, 0.06, 0.012, 10), M.fabricLt, [-0.106, 0.8, z], [0, 0, Math.PI / 2], tv);
  });

  // fliperama ao lado da TV
  const arcade = group('arcade_cabinet', hobby);
  arcade.position.set(0.7, 0, -1.85); arcade.rotation.y = -0.9;
  part('arcade_body', box(0.5, 1.5, 0.62), M.fabric, [0, 0.75, 0], [0, 0, 0], arcade);
  part('arcade_marquee', box(0.06, 0.26, 0.58), M.neon, [-0.24, 1.34, 0], [0, 0, 0], arcade);
  part('arcade_screen', box(0.05, 0.42, 0.5), M.screen, [-0.235, 0.98, 0], [0, 0.0, -0.12], arcade);
  part('arcade_panel', box(0.36, 0.06, 0.56), M.shell, [-0.12, 0.74, 0], [0, 0, 0.25], arcade);
  part('arcade_stick', cyl(0.016, 0.016, 0.12, 6), M.shellLt, [-0.16, 0.83, -0.12], [0, 0, 0.2], arcade);
  part('arcade_ball', new THREE.SphereGeometry(0.035, 20, 14), M.accent, [-0.17, 0.89, -0.12], [0, 0, 0], arcade);
  ([[0.06], [0.14]] as [number][]).forEach(([z], i) => part(`arcade_button_${i + 1}`, cyl(0.028, 0.028, 0.02, 8), M.accent, [-0.13, 0.8, z + 0.04], [0, 0, 0.25], arcade));
  part('arcade_base_glow', box(0.52, 0.06, 0.64), M.neon, [0, 0.03, 0], [0, 0, 0], arcade);

  const fl = group('floor_lamp', hobby);
  /* No vão entre a ponta do sofá e o quadro de projetos.
     A medida NÃO pode sair das caixas desenhadas logo acima: elas somem
     quando o .glb entra, e o sofá do arquivo é bem maior. Medido na cena
     montada, em coordenadas da ilha, o sofá ocupa x de 0,04 a 1,36 e z de
     -1,35 a 1,85, e o quadro começa em z=-2,69. A lamparina tem 0,42 de
     diâmetro, então z=-1,65 a encosta no braço com um palmo de folga e
     ainda deixa 0,8 até o quadro.
     O x fica na metade da frente do sofá, e não no meio da ilha: a câmera
     que enquadra o quadro de projetos desce por volta de x=0,5, e foi ela
     que expulsou a lamparina daqui da primeira vez. */
  fl.position.set(-0.85, 0, -1.75);
  part('floor_lamp_base', cyl(0.16, 0.18, 0.04, 8), M.shell, [0, 0.02 + TOPO_DAS_TABUAS, 0], [0, 0, 0], fl);
  part('floor_lamp_pole', cyl(0.02, 0.02, 1.4, 6), M.metal, [0, 0.7 + TOPO_DAS_TABUAS, 0], [0, 0, 0], fl);
  part('floor_lamp_shade', cyl(0.16, 0.22, 0.26, 8, 1), M.cream, [0, 1.5 + TOPO_DAS_TABUAS, 0], [0, 0, 0], fl);

  /* A luz da lamparina.
     Fica no grupo dela, e não solta na cena, para acompanhar a lamparina se
     ela mudar de lugar de novo. Sem sombra de propósito: uma luz pontual com
     sombra desenha a cena inteira seis vezes, uma por face do cubo, e o que
     ela acrescentaria aqui — a sombra do próprio poste — some debaixo do
     sofá. O alcance de 4,5 m cobre a área gamer e morre antes da mesa de
     trabalho, do outro lado da ilha. */
  const luzDaLamparina = new THREE.PointLight(0xffc27a, 17, 6, 2);
  luzDaLamparina.name = 'floor_lamp_light';
  luzDaLamparina.position.set(0, 1.44 + TOPO_DAS_TABUAS, 0);
  fl.add(luzDaLamparina);
  /* A lâmpada em si, para a cúpula não ficar escura por dentro quando a
     câmera passa por baixo. */
  part('floor_lamp_bulb', new THREE.SphereGeometry(0.05, 12, 8), M.bulb, [0, 1.44 + TOPO_DAS_TABUAS, 0], [0, 0, 0], fl);
  model.add(hobby);

  /* A lamparina de teto: no meio da ilha, pendurada em nada.
     A ilha não tem teto, e é isso que a torna uma ilha voadora — então a
     lamparina fica no ar mesmo, no eixo do deck (raio 4,15 centrado na
     origem). A 1,95 do chão: no meio do deck o mais alto é o topo das
     estantes, com 1,39, então ela passa por cima de tudo que está embaixo
     dela sem subir tanto a ponto de se soltar da sala — os quadros de 2,1
     estão na borda, longe do eixo.
     A luz mora no grupo, e não solta na cena, para acompanhar a lamparina se
     ela mudar de lugar. Sem sombra pelo mesmo motivo da luminária de chão:
     uma luz pontual com sombra redesenha a cena inteira seis vezes, uma por
     face do cubo. */
  const cl = group('ceiling_lamp', island);
  /* Mesma marca do domo: ela pendura no ar acima de tudo e não pode mandar no
     enquadramento da vista geral. Ver `foraDaMedida` lá embaixo. */
  cl.userData.foraDaMedida = true;
  cl.position.set(0, 1.95, 0);
  part('ceiling_lamp_cable', cyl(0.012, 0.012, 0.8, 6), M.metal, [0, 0.95, 0], [0, 0, 0], cl);
  part('ceiling_lamp_shade', cyl(0.06, 0.24, 0.3, 12), M.cream, [0, 0.4, 0], [0, 0, 0], cl);
  part('ceiling_lamp_bulb', new THREE.SphereGeometry(0.06, 14, 10), M.bulb, [0, 0.3, 0], [0, 0, 0], cl);

  /* Alcance de 9 m: daqui do meio, a 2,6 de altura, é o que faz a luz chegar
     à borda do deck de 4,15 de raio em vez de morrer no tapete. */
  /* A haste que prende a lamparina no domo.
     Ela ficava pendurada em nada: o modelo termina em 2,90 e o ápice do vidro
     está em 4,087 — 1,19 m de vão. Enquanto a ilha não tinha teto isso era a
     graça da coisa; com o domo por cima, virou uma peça flutuando embaixo de
     um teto que existe.

     As duas pontas saem de medida, não de palpite: 1,187 de comprimento, com
     o centro em 3,4935 no eixo da ilha — 1,5435 aqui dentro, porque o grupo
     mora a 1,95. Em ferro, como o aro do domo: é dele que ela pende.

     NÃO entra em `substitui` da `LAMPARINA_TETO`: o .glb troca o cabo, a
     cúpula e a lâmpada desenhados, e a haste é peça da casa, não do modelo. */
  part('ceiling_lamp_haste', cyl(0.012, 0.012, 1.187, 8), M.friso, [0, 1.5435, 0], [0, 0, 0], cl);

  const luzDoTeto = new THREE.PointLight(0xffc27a, 26, 9, 2);
  luzDoTeto.name = 'ceiling_lamp_light';
  luzDoTeto.position.set(0, 0.28, 0);
  cl.add(luzDoTeto);

  /* ---------- o domo ---------- */

  /* O vidro que fecha a ilha por cima.
     Ele é o que transforma o deck num habitat: a ilha deixa de ser uma sala
     jogada no espaço e passa a ser um lugar onde se pode estar.

     Não pode atrapalhar de ver, e isso decide o material inteiro: opacidade de
     0,08 e `depthWrite` desligado. Sem desligar a escrita de profundidade, o
     vidro entraria no buffer e apagaria os móveis atrás dele mesmo sendo
     quase invisível — é o erro clássico de transparência, e o sintoma seria a
     sala sumindo por trás de um nada.

     `DoubleSide` porque a câmera fica DENTRO do domo nas paradas: com uma face
     só, o vidro desapareceria assim que a câmera entrasse.

     4,05 de raio contra os 4,15 do deck: a base pousa EM CIMA da quina de
     ferro, no anel entre o fim das tábuas (3,78) e a borda (4,15). Em 4,35,
     que foi a primeira tentativa, o aro sobrava para fora do deck e parecia
     um arco flutuando em volta da ilha em vez do encaixe de uma cúpula.
     A altura sobra bem acima da lamparina de teto, que é a peça mais alta com
     2,9. */
  const domo = group('domo', island);
  /* Fora de três contas que varrem a ilha inteira, e a marca diz isso a elas
     em vez de cada uma reconhecer o domo pelo nome: o enquadramento da vista
     geral (que subiria a mira 4 m e encolheria a ilha), o mapa de obstáculos
     (a câmera passaria a "desviar" de uma cúpula que a envolve, e toda parada
     iria parar colada na tela) e o raio do clique. */
  domo.userData.foraDaMedida = true;

  const vidroDoDomo = new THREE.MeshPhysicalMaterial({
    name: 'vidroDomo',
    color: 0x9fc4ff,
    metalness: 0,
    roughness: 0.06,
    transparent: true,
    /* 0,055 e não 0,08: com `DoubleSide` a frente e o fundo da cúpula somam,
       então o que se vê é o dobro disso. Em 0,08 o vidro lavava as estrelas
       atrás dele e a cúpula virava um véu leitoso sobre o céu. */
    opacity: 0.055,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const cupula = part(
    'domo_vidro',
    new THREE.SphereGeometry(R - 0.1, 40, 22, 0, Math.PI * 2, 0, Math.PI / 2),
    vidroDoDomo,
    [0, TOPO_DAS_TABUAS, 0],
    [0, 0, 0],
    domo,
  );
  /* O raio do clique nunca acerta o vidro. Sem isto, o domo envolve a cena
     inteira e seria SEMPRE o primeiro acerto: nenhum móvel abriria a seção e
     nada mais cairia da mesa. */
  cupula.raycast = () => {};
  cupula.castShadow = false;
  cupula.receiveShadow = false;

  /* O aro de ferro onde o vidro encaixa. É ele que faz o domo ter borda em vez
     de terminar no ar, e é a mesma liga do casco. */
  const aro = part(
    'domo_aro',
    new THREE.TorusGeometry(R - 0.1, 0.05, 10, 72),
    M.friso,
    [0, TOPO_DAS_TABUAS + 0.01, 0],
    [Math.PI / 2, 0, 0],
    domo,
  );
  aro.raycast = () => {};

  model.add(island);
  /* Centraliza no chão: a cena original fazia isso antes de entregar ao
     visualizador, e o enquadramento da câmera depende disso. */
  const bb = new THREE.Box3().setFromObject(model);
  const c = bb.getCenter(new THREE.Vector3());
  model.position.set(-c.x, -bb.min.y, -c.z);

  return model;
}
