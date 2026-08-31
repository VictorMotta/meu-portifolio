import * as THREE from "three";

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

  const M = {
    snow:     mat('floorSlate', 0x2a3346, { roughness: 0.7 }),
    crust:    mat('floorSlateDeep', 0x1b2231, { flat: true }),
    rock:     mat('rockNavy', 0x141b2a, { flat: true }),
    rockDark: mat('rockBlack', 0x0d121d, { flat: true }),
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
    screen:   mat('screenCyan', 0x0e2a38, { emissive: 0x35c8f0, emissiveIntensity: 1.5, roughness: 0.2 }),
    screenTv: mat('screenBlue', 0x121a34, { emissive: 0x3b6ef5, emissiveIntensity: 1.3, roughness: 0.2 }),
    neon:     mat('neonBlue', 0x14224a, { emissive: 0x2f6bff, emissiveIntensity: 1.6, roughness: 0.3 }),
    accent:   mat('accentTeal', 0x1d8fa8, { roughness: 0.5 }),
    cream:    mat('paperCool', 0xa8b3c6, { roughness: 0.8 }),
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

  part('island_top', cyl(R, R * 0.98, 0.22, SEG), M.snow, [0, -0.11, 0], [0, ROT, 0], island);
  part('island_crust', cyl(R * 0.98, R * 0.86, 0.34, SEG), M.crust, [0, -0.42, 0], [0, ROT, 0], island);
  part('island_rock_upper', cyl(R * 0.86, R * 0.6, 0.9, SEG), M.rock, [0, -1.04, 0], [0, ROT, 0], island);
  part('island_rock_mid', cyl(R * 0.6, R * 0.34, 0.9, SEG), M.rockDark, [0, -1.94, 0], [0, ROT * 2, 0], island);
  part('island_tip', new THREE.ConeGeometry(R * 0.34, 1.5, SEG), M.rockDark, [0, -3.14, 0], [0, ROT, 0], island);

  // blocos de rocha salientes
  ([[2.0, -1.0, 1.3, 0.5], [-2.1, -1.35, 0.8, 0.42], [0.5, -1.7, -2.0, 0.46],
   [-1.1, -2.3, -1.0, 0.36], [2.0, -0.75, -1.3, 0.4], [1.4, -2.6, 0.5, 0.3]] as [number, number, number, number][]).forEach(([x, y, z, r], i) => {
    const m = part(`rock_chunk_${i + 1}`, new THREE.DodecahedronGeometry(r, 0), i % 2 ? M.rock : M.rockDark, [x, y, z], [i, i * 0.8, i * 0.4], island);
    m.scale.set(1, 0.75, 1.05);
  });
  // rochas flutuantes
  ([[3.7, -1.7, -0.9, 0.34], [-3.4, -2.9, 1.3, 0.26], [1.3, -4.6, 1.1, 0.3], [-2.4, -4.2, -1.6, 0.22]] as [number, number, number, number][]).forEach(([x, y, z, r], i) => {
    const m = part(`floating_rock_${i + 1}`, new THREE.DodecahedronGeometry(r, 0), M.rock, [x, y, z], [i, i * 1.3, i], island);
    m.scale.set(1, 0.7, 1);
  });
  // piso de tábuas
  const floorMats = [mat('floorPlankA', 0x2c3547, { roughness: 0.55 }), mat('floorPlankB', 0x232b3b, { roughness: 0.6 })];
  const FR = 3.78, PW = 0.44;
  const rows = Math.floor((FR * 2) / PW);
  for (let i = 0; i < rows; i++) {
    const z = -FR + PW / 2 + i * PW;
    const half = Math.sqrt(Math.max(FR * FR - z * z, 0));
    if (half < 0.15) continue;
    const segs = Math.max(1, Math.round((half * 2) / 1.6));
    const segW = (half * 2) / segs;
    for (let j = 0; j < segs; j++) {
      const x = -half + segW / 2 + j * segW;
      part(`floor_plank_${i + 1}_${j + 1}`, box(segW - 0.02, 0.035, PW - 0.02), floorMats[(i + j) % 2]!, [x, 0.019, z], [0, 0, 0], island);
    }
  }
  part('floor_trim', new THREE.TorusGeometry(FR + 0.05, 0.05, 12, 64), M.shellLt, [0, 0.03, 0], [Math.PI / 2, 0, 0], island);

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
  officePlant('office_plant_1', -2.45, 2.35, 1.0, island);
  officePlant('office_plant_2', 2.55, 2.2, 0.85, island);
  officePlant('office_plant_3', -3.2, -0.5, 0.75, island);

  // quadro branco
  const wb = group('whiteboard', island);
  wb.position.set(-2.05, 0, -2.35); wb.rotation.y = 0.85; wb.scale.setScalar(0.85);
  part('whiteboard_panel', box(0.07, 1.0, 1.7), M.cream, [0, 1.0, 0], [0, 0, 0], wb);
  part('whiteboard_frame', box(0.05, 1.06, 1.76), M.metal, [-0.02, 1.0, 0], [0, 0, 0], wb);
  /* Os rabiscos viraram texto de verdade: ver `texturas.ts`. */
  part('whiteboard_tray', box(0.14, 0.05, 1.6), M.metal, [0.06, 0.48, 0], [0, 0, 0], wb);
  ([[-0.4], [0.3]] as [number][]).forEach(([z], i) => part(`whiteboard_leg_${i + 1}`, cyl(0.035, 0.035, 0.5, 6), M.metal, [0, 0.25, z], [0, 0, 0], wb));
  ([[-0.4], [0.3]] as [number][]).forEach(([z], i) => part(`whiteboard_foot_${i + 1}`, box(0.5, 0.05, 0.08), M.metal, [0, 0.02, z], [0, 0, 0], wb));

  // arquivo de gavetas
  const fc = group('filing_cabinet', island);
  fc.position.set(-1.9, 0, 2.7); fc.rotation.y = -0.35;
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
  bx.position.set(1.1, 0, 3.15);
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
  sheet.position.set(0, 1.3, 0.06); sheet.rotation.x = -0.09;
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
  part('tv_neck', box(0.1, 0.3, 0.28), M.shell, [0, 0.6, 0], [0, 0, 0], tv);
  part('tv_frame', box(0.06, 0.72, 1.42), M.shell, [-0.01, 1.12, 0], [0, 0, 0], tv);
  part('tv_screen', box(0.014, 0.66, 1.36), M.screenTv, [-0.045, 1.12, 0], [0, 0, 0], tv);
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
  /* Encostado no canto entre o sofá e o fliperama. Onde estava, o abajur
     ficava exatamente na linha de visão do quadro de projetos: a câmera que
     enquadra o quadro parava dentro da cúpula. */
  fl.position.set(-0.35, 0, -1.75);
  part('floor_lamp_base', cyl(0.16, 0.18, 0.04, 8), M.shell, [0, 0.02, 0], [0, 0, 0], fl);
  part('floor_lamp_pole', cyl(0.02, 0.02, 1.4, 6), M.metal, [0, 0.7, 0], [0, 0, 0], fl);
  part('floor_lamp_shade', cyl(0.16, 0.22, 0.26, 8, 1), M.cream, [0, 1.5, 0], [0, 0, 0], fl);
  model.add(hobby);

  model.add(island);
  /* Centraliza no chão: a cena original fazia isso antes de entregar ao
     visualizador, e o enquadramento da câmera depende disso. */
  const bb = new THREE.Box3().setFromObject(model);
  const c = bb.getCenter(new THREE.Vector3());
  model.position.set(-c.x, -bb.min.y, -c.z);

  return model;
}
