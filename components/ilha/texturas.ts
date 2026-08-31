import * as THREE from "three";

import type { Dictionary } from "@/content/i18n";
import { mod } from "@/content/hobby";
import { stack, stackGroupOrder } from "@/content/stack";
import type { Project } from "@/lib/projects";

/**
 * O que está escrito nas telas e nos quadros da ilha.
 *
 * Um monitor apagado entrega que a cena é cenário. Aqui cada tela recebe uma
 * textura desenhada em canvas com o conteúdo de verdade do portfólio — o
 * mesmo texto que o painel de HTML mostra quando a câmera chega perto. São
 * poucos quilobytes de pixels gerados no navegador, sem imagem para baixar.
 *
 * Isto é decoração: quem lê o site lê o HTML por cima. Por isso o texto aqui
 * é curto e serve de miniatura, não de conteúdo.
 */

/* Resolução das texturas. O monitor ocupa uns 900px de tela no zoom máximo,
   então 1024 de largura já não mostra serrilhado. */
const LARGURA = 1024;

type Pincel = CanvasRenderingContext2D;

function tela(altura: number): { c: HTMLCanvasElement; p: Pincel } | null {
  const c = document.createElement("canvas");
  c.width = LARGURA;
  c.height = altura;
  const p = c.getContext("2d");
  return p ? { c, p } : null;
}

/** Escreve com quebra de linha e devolve onde parou. */
function escrever(
  p: Pincel,
  texto: string,
  x: number,
  y: number,
  largura: number,
  alturaLinha: number,
  maxLinhas = 99,
): number {
  const palavras = texto.split(" ");
  let linha = "";
  let linhas = 0;
  let cursor = y;

  for (const palavra of palavras) {
    const tentativa = linha ? `${linha} ${palavra}` : palavra;
    if (p.measureText(tentativa).width > largura && linha) {
      p.fillText(linha, x, cursor);
      cursor += alturaLinha;
      linha = palavra;
      if (++linhas >= maxLinhas) return cursor;
    } else {
      linha = tentativa;
    }
  }
  if (linha) {
    p.fillText(linha, x, cursor);
    cursor += alturaLinha;
  }
  return cursor;
}

const MONO = '"JetBrains Mono", ui-monospace, monospace';
const SANS = 'Inter, ui-sans-serif, system-ui, sans-serif';

/** Barra de janela com as três bolinhas e um título. */
function janela(p: Pincel, titulo: string, fundo: string) {
  p.fillStyle = fundo;
  p.fillRect(0, 0, LARGURA, p.canvas.height);
  p.fillStyle = "rgba(0,0,0,0.22)";
  p.fillRect(0, 0, LARGURA, 54);
  for (const [i, cor] of ["#ff5f57", "#febc2e", "#28c840"].entries()) {
    p.beginPath();
    p.arc(34 + i * 30, 27, 8, 0, Math.PI * 2);
    p.fillStyle = cor;
    p.fill();
  }
  p.font = `20px ${MONO}`;
  p.fillStyle = "rgba(255,255,255,0.55)";
  p.fillText(titulo, 140, 34);
}

/* ---------- as telas ---------- */

/* A tela do ultrawide tem proporção 2,259 (10,371 x 4,591 no arquivo do
   modelo). O canvas precisa nascer com ela, senão a textura é esticada e o
   texto do monitor sai com outras proporções do que o painel mostra. */
const ALTURA_ULTRAWIDE = Math.round(LARGURA / 2.259);

/* O mesmo valor de `--papel` em `.sup-tela` (globals.css): o azul-noite do
   Dracula. É o que faz a tela do 3D e o painel parecerem o mesmo app, e não
   duas telas diferentes. */
const PAPEL_TELA = "#21222c";

/**
 * O "Sobre" como o painel mostra: chapéu, título, foto, os três parágrafos e
 * a régua de números. Separado de `telaSobre` porque a foto chega depois — o
 * desenho precisa ser refeito quando ela carrega.
 */
function desenharSobre(p: Pincel, dict: Dictionary, foto: CanvasImageSource | null) {
  janela(p, "sobre.md", PAPEL_TELA);

  p.font = `17px ${MONO}`;
  p.fillStyle = "#4ee1c1";
  p.fillText(dict.about.eyebrow.toUpperCase(), 44, 88);

  p.font = `bold 32px ${SANS}`;
  p.fillStyle = "#f8f8f2";
  const fimDoTitulo = escrever(p, dict.about.title, 44, 126, LARGURA - 88, 38, 2);

  const topo = Math.max(fimDoTitulo + 12, 176);
  const LARGURA_FOTO = 100;
  const ALTURA_FOTO = 117;

  if (foto) {
    p.drawImage(foto, 44, topo, LARGURA_FOTO, ALTURA_FOTO);
  } else {
    /* Enquanto a foto não chega, o lugar dela fica reservado: sem isso o
       texto nasceria encostado na esquerda e pularia quando ela carregasse. */
    p.fillStyle = "#2b2d3a";
    p.fillRect(44, topo, LARGURA_FOTO, ALTURA_FOTO);
  }

  const x = 44 + LARGURA_FOTO + 16;
  const largura = LARGURA - x - 44;
  let y = topo + 16;
  p.font = `16px ${SANS}`;
  p.fillStyle = "#9aa5cf";
  for (const paragrafo of dict.about.paragraphs) {
    y = escrever(p, paragrafo, x, y, largura, 23, 3) + 7;
    if (y > ALTURA_ULTRAWIDE - 88) break;
  }

  const numeros: [string, string][] = [
    [dict.about.stats.experience, "4+"],
    [dict.about.stats.projects, "12"],
    [dict.about.stats.focus, dict.about.stats.focusValue],
  ];
  const base = ALTURA_ULTRAWIDE - 52;
  p.fillStyle = "#383a4d";
  p.fillRect(44, base - 24, LARGURA - 88, 1);
  numeros.forEach(([rotulo, valor], i) => {
    const coluna = 44 + i * ((LARGURA - 88) / 3);
    p.font = `12px ${MONO}`;
    p.fillStyle = "#8b95bd";
    p.fillText(rotulo.toUpperCase(), coluna, base);
    p.font = `19px ${SANS}`;
    p.fillStyle = "#f8f8f2";
    p.fillText(valor, coluna, base + 26);
  });
}

function telaSobre(dict: Dictionary) {
  const t = tela(ALTURA_ULTRAWIDE);
  if (!t) return null;
  desenharSobre(t.p, dict, null);
  return t.c;
}

function telaContato(dict: Dictionary) {
  const t = tela(ALTURA_ULTRAWIDE);
  if (!t) return null;
  const { c, p } = t;
  const f = dict.contact.form;
  janela(p, "contato", PAPEL_TELA);

  p.font = `17px ${MONO}`;
  p.fillStyle = "#4ee1c1";
  p.fillText(dict.contact.eyebrow.toUpperCase(), 44, 82);

  p.font = `bold 28px ${SANS}`;
  p.fillStyle = "#f8f8f2";
  escrever(p, dict.contact.title, 44, 112, LARGURA - 88, 32, 1);

  p.font = `14px ${SANS}`;
  p.fillStyle = "#9aa5cf";
  escrever(p, dict.contact.lead, 44, 136, LARGURA - 88, 18, 1);

  /* O mesmo formulário do painel, campo por campo: duas colunas em cima, a
     mensagem e o anexo inteiros embaixo, e o botão no fim. Os textos são os
     mesmos do dicionário, então mudar um rótulo muda os dois lugares. */
  const caixa = (
    rotulo: string,
    dentro: string,
    x: number,
    y: number,
    largura: number,
    alto: number,
    opcional?: string,
  ) => {
    p.font = `13px ${SANS}`;
    p.fillStyle = "#c3cbe4";
    p.fillText(rotulo, x, y);
    if (opcional) {
      p.font = `11px ${MONO}`;
      p.fillStyle = "#8b95bd";
      const largo = p.measureText(opcional).width;
      p.fillText(opcional, x + largura - largo, y);
    }
    p.fillStyle = "#191a22";
    p.fillRect(x, y + 8, largura, alto);
    p.strokeStyle = "#383a4d";
    p.lineWidth = 1;
    p.strokeRect(x + 0.5, y + 8.5, largura - 1, alto - 1);
    p.font = `13px ${SANS}`;
    p.fillStyle = "#6f7796";
    escrever(p, dentro, x + 12, y + 28, largura - 24, 16, 1);
  };

  const dica = (texto: string, x: number, y: number, largura: number) => {
    p.font = `11px ${SANS}`;
    p.fillStyle = "#8b95bd";
    escrever(p, texto, x, y, largura, 14, 1);
  };

  const meia = (LARGURA - 88 - 22) / 2;
  const direita = 44 + meia + 22;

  caixa(f.name, f.namePlaceholder, 44, 168, meia, 28);
  caixa(f.email, f.emailPlaceholder, direita, 168, meia, 28);
  dica(f.emailHint, direita, 218, meia);

  caixa(f.company, f.companyPlaceholder, 44, 234, meia, 28, f.companyOptional);
  caixa(f.projectType, f.projectTypes.web, direita, 234, meia, 28);

  caixa(f.message, f.messagePlaceholder, 44, 288, LARGURA - 88, 44);
  dica(f.messageHint, 44, 352, LARGURA - 88);

  /* A área de anexo: no painel é um alvo de arrastar imagens, aqui é a mesma
     moldura tracejada com o mesmo convite escrito. */
  p.font = `13px ${SANS}`;
  p.fillStyle = "#c3cbe4";
  p.fillText(f.files, 44, 376);
  p.font = `11px ${MONO}`;
  p.fillStyle = "#8b95bd";
  const largoOpcional = p.measureText(f.filesOptional).width;
  p.fillText(f.filesOptional, LARGURA - 44 - largoOpcional, 376);

  p.strokeStyle = "#383a4d";
  p.setLineDash([6, 5]);
  p.strokeRect(44.5, 384.5, LARGURA - 89, 26);
  p.setLineDash([]);
  p.font = `12px ${SANS}`;
  p.fillStyle = "#6f7796";
  p.textAlign = "center";
  p.fillText(f.filesDrop, LARGURA / 2, 401);
  p.textAlign = "left";

  p.fillStyle = "#4ee1c1";
  p.fillRect(44, ALTURA_ULTRAWIDE - 34, 168, 26);
  p.font = `bold 13px ${SANS}`;
  p.fillStyle = "#04120e";
  p.fillText(f.submit, 60, ALTURA_ULTRAWIDE - 16);
  return c;
}

function telaTerminal() {
  const t = tela(580);
  if (!t) return null;
  const { c, p } = t;
  janela(p, "zsh", "#07121a");

  const linhas: [string, string][] = [
    ["#4ee1c1", "$ npm run dev"],
    ["#9fc0c6", "  ▲ Next.js 16.3.3 (Turbopack)"],
    ["#9fc0c6", "  - Local:  http://localhost:3000"],
    ["#4ee1c1", "  ✓ Ready in 1.2s"],
    ["#7fa3ab", "  ○ Compiling /[locale] ..."],
    ["#4ee1c1", "  ✓ Compiled in 640ms"],
    ["#4ee1c1", "$ ▊"],
  ];
  p.font = `24px ${MONO}`;
  linhas.forEach(([cor, texto], i) => {
    p.fillStyle = cor;
    p.fillText(texto, 44, 130 + i * 42);
  });
  return c;
}

/**
 * A TV como o painel dos Mods mostra: chapéu, título, chamada, o cartão do
 * mod com ícone, nome, resumo, etiquetas e botões, e a linha de rodapé.
 */
function desenharTv(p: Pincel, dict: Dictionary, icone: CanvasImageSource | null) {
  const t = dict.hobby;
  const ALTURA = 500;

  const g = p.createLinearGradient(0, 0, LARGURA, ALTURA);
  g.addColorStop(0, "#1a1b2b");
  g.addColorStop(1, "#111220");
  p.fillStyle = g;
  p.fillRect(0, 0, LARGURA, ALTURA);

  p.font = `17px ${MONO}`;
  p.fillStyle = "#6f8fff";
  p.fillText(t.eyebrow.toUpperCase(), 44, 62);

  p.font = `bold 30px ${SANS}`;
  p.fillStyle = "#eef2ff";
  escrever(p, t.title, 44, 98, LARGURA - 88, 34, 1);

  p.font = `14px ${SANS}`;
  p.fillStyle = "#93a7e8";
  escrever(p, t.lead, 44, 124, LARGURA - 88, 19, 2);

  /* O cartão do mod, com a mesma moldura do painel. */
  const cartao = { x: 44, y: 168, largura: LARGURA - 88, altura: 246 };
  p.fillStyle = "rgba(255,255,255,0.05)";
  p.fillRect(cartao.x, cartao.y, cartao.largura, cartao.altura);
  p.strokeStyle = "#31355a";
  p.lineWidth = 1;
  p.strokeRect(cartao.x + 0.5, cartao.y + 0.5, cartao.largura - 1, cartao.altura - 1);

  const LADO_ICONE = 104;
  if (icone) {
    p.drawImage(icone, cartao.x + 18, cartao.y + 18, LADO_ICONE, LADO_ICONE);
  } else {
    p.fillStyle = "#2a2d47";
    p.fillRect(cartao.x + 18, cartao.y + 18, LADO_ICONE, LADO_ICONE);
  }

  const x = cartao.x + 18 + LADO_ICONE + 18;
  const largura = cartao.x + cartao.largura - 18 - x;

  p.font = `bold 20px ${SANS}`;
  p.fillStyle = "#eef2ff";
  p.fillText(mod.nome, x, cartao.y + 42);

  p.font = `13px ${SANS}`;
  p.fillStyle = "#93a7e8";
  let y = escrever(p, t.modResumo, x, cartao.y + 68, largura, 19, 5) + 8;

  /* Etiquetas, como as do painel. */
  p.font = `12px ${MONO}`;
  let etiqueta = x;
  for (const tag of mod.tags) {
    const largo = p.measureText(tag).width + 18;
    if (etiqueta + largo > x + largura) break;
    p.fillStyle = "rgba(111,143,255,0.18)";
    p.fillRect(etiqueta, y, largo, 22);
    p.fillStyle = "#b9c6ff";
    p.fillText(tag, etiqueta + 9, y + 16);
    etiqueta += largo + 8;
  }
  y += 38;

  /* Os dois botões: o cheio leva ao manual, o de contorno à Oficina. */
  p.font = `13px ${SANS}`;
  const largoManual = p.measureText(t.verManual).width + 26;
  p.fillStyle = "#4ee1c1";
  p.fillRect(x, y, largoManual, 26);
  p.fillStyle = "#04120e";
  p.fillText(t.verManual, x + 13, y + 18);

  const largoWorkshop = p.measureText(t.verNaWorkshop).width + 26;
  p.strokeStyle = "#31355a";
  p.strokeRect(x + largoManual + 10 + 0.5, y + 0.5, largoWorkshop, 26);
  p.fillStyle = "#eef2ff";
  p.fillText(t.verNaWorkshop, x + largoManual + 10 + 13, y + 18);

  p.font = `13px ${MONO}`;
  p.fillStyle = "#7d8cc4";
  p.fillText(`${mod.linhasDeLua} ${t.linhasLua} · ${mod.buildDoJogo}`, 44, ALTURA - 26);
}

function telaTv(dict: Dictionary) {
  const t = tela(500);
  if (!t) return null;
  desenharTv(t.p, dict, null);
  return t.c;
}

function telaArcade() {
  const t = tela(620);
  if (!t) return null;
  const { c, p } = t;
  p.fillStyle = "#0a0f1e";
  p.fillRect(0, 0, LARGURA, 620);
  p.font = `bold 72px ${MONO}`;
  p.fillStyle = "#4ee1c1";
  p.textAlign = "center";
  p.fillText("INSERT", LARGURA / 2, 260);
  p.fillText("COIN", LARGURA / 2, 340);
  p.font = `32px ${MONO}`;
  p.fillStyle = "#6f8fff";
  p.fillText("1 PLAYER", LARGURA / 2, 440);
  p.textAlign = "left";
  return c;
}

/* ---------- os quadros ---------- */

/**
 * A lousa como o painel da Stack mostra: chapéu, título com o traço de
 * marcador, chamada e os quatro grupos, cada tecnologia com o ponto da cor
 * dela — o mesmo ponto do painel, que existe para a cor não virar fundo e
 * derrubar o contraste do texto.
 */
function quadroStack(dict: Dictionary) {
  const t = tela(600);
  if (!t) return null;
  const { c, p } = t;
  const d = dict.stack;

  p.fillStyle = "#d7dde7";
  p.fillRect(0, 0, LARGURA, 600);

  const marcadores = ["#0e7490", "#1d4ed8", "#166534", "#7c2d12"];

  p.font = `15px ${MONO}`;
  p.fillStyle = "#0a5648";
  p.fillText(d.eyebrow.toUpperCase(), 48, 62);

  /* O traço largo por baixo do título é a caneta de quadro branco. */
  p.font = `bold 36px ${SANS}`;
  const largoTitulo = p.measureText(d.title).width;
  p.fillStyle = "rgba(29,78,216,0.28)";
  p.fillRect(48, 86, Math.min(largoTitulo, LARGURA - 96), 14);
  p.fillStyle = "#171b23";
  p.fillText(d.title, 48, 98);

  p.font = `16px ${SANS}`;
  p.fillStyle = "#3f4854";
  escrever(p, d.lead, 48, 130, LARGURA - 96, 22, 2);

  stackGroupOrder.forEach((grupo, i) => {
    const coluna = 48 + (i % 2) * ((LARGURA - 96) / 2);
    const linha = 208 + Math.floor(i / 2) * 190;
    const largura = (LARGURA - 96) / 2 - 32;

    const rotulo = d.groups[grupo].toUpperCase();
    p.font = `bold 16px ${MONO}`;
    p.fillStyle = "#171b23";
    p.fillText(rotulo, coluna, linha);
    p.fillStyle = marcadores[i % marcadores.length]!;
    p.fillRect(coluna, linha + 7, p.measureText(rotulo).width, 2);

    /* Uma tecnologia por linha, com o ponto da cor à frente — como no
       painel, e não um "a · b · c" corrido, que era outra informação. */
    p.font = `16px ${SANS}`;
    let y = linha + 34;
    let x = coluna;
    for (const skill of stack[grupo]) {
      const largo = p.measureText(skill.name).width + 14;
      if (x + largo > coluna + largura && x > coluna) {
        x = coluna;
        y += 26;
      }
      if (y > linha + 150) break;
      p.beginPath();
      p.arc(x + 3, y - 5, 3, 0, Math.PI * 2);
      p.fillStyle = skill.cor;
      p.fill();
      p.fillStyle = "#3f4854";
      p.fillText(skill.name, x + 12, y);
      x += largo + 14;
    }
  });
  return c;
}

function faixaDoQuadro(texto: string) {
  const t = tela(64);
  if (!t) return null;
  const { c, p } = t;
  p.fillStyle = "#1d4ed8";
  p.fillRect(0, 0, LARGURA, 64);
  p.font = `bold 30px ${MONO}`;
  p.fillStyle = "#ffffff";
  p.fillText(texto.toUpperCase(), 28, 44);
  return c;
}

/**
 * O corpo do quadro de projetos: o título e a chamada do painel.
 *
 * Eles pousam na faixa de baixo porque é a única livre — o topo do quadro é
 * ocupado pela faixa azul e pelas três tarjas de coluna, que são peças de
 * geometria, não desenho, e não dá para empurrar sem mexer na cena gerada.
 * Só é desenhado quando a terceira fileira de post-its está escondida; com
 * mais de seis projetos ela desce até aqui e o texto ficaria por baixo.
 */
function corpoDoQuadro(dict: Dictionary) {
  const ALTURA = 589;
  const t = tela(ALTURA);
  if (!t) return null;
  const { c, p } = t;

  p.fillStyle = "#c3cbd9";
  p.fillRect(0, 0, LARGURA, ALTURA);

  /* Logo abaixo da faixa azul, na mesma ordem do painel: chapéu na faixa,
     título, chamada, e então os cartões. A faixa termina em 95px e a
     primeira fileira de post-its começa em 172px — os 77px entre as duas
     são exatamente o espaço que as tarjas de coluna ocupavam. */
  p.font = `bold 34px ${SANS}`;
  p.fillStyle = "#171b23";
  p.fillText(dict.projects.title, 58, 132);

  p.font = `19px ${SANS}`;
  p.fillStyle = "#3f4854";
  escrever(p, dict.projects.lead, 58, 162, LARGURA - 116, 24, 1);
  return c;
}

/**
 * O post-it como o cartão do projeto no painel: título, resumo e a stack.
 * Antes era só o título centralizado, e o quadro dizia menos do que o painel.
 */
/* A nota, depois de reposicionada, mede 0,553 x 0,332 — proporção 1,666. O
   canvas nasce com ela para o texto não sair esticado. */
const ALTURA_NOTA = Math.round(LARGURA / 1.666);

function postIt(projeto: Project, dict: Dictionary, fundo: string) {
  const t = tela(ALTURA_NOTA);
  if (!t) return null;
  const { c, p } = t;
  p.fillStyle = fundo;
  p.fillRect(0, 0, LARGURA, ALTURA_NOTA);

  const margem = 66;
  const largura = LARGURA - margem * 2;

  p.font = `bold 62px ${SANS}`;
  p.fillStyle = "#12202b";
  let y = escrever(p, projeto.title, margem, 132, largura, 74, 3) + 22;

  p.font = `34px ${SANS}`;
  p.fillStyle = "#2c4353";
  y = escrever(p, projeto.summary, margem, y, largura, 44, 6) + 16;

  p.font = `30px ${MONO}`;
  p.fillStyle = "#3c5a6d";
  y = escrever(p, projeto.stack.join(" · "), margem, Math.min(y, 520), largura, 38, 2) + 12;

  p.font = `30px ${MONO}`;
  p.fillStyle = "#12202b";
  p.fillText(`${dict.projects.viewCase} \u2197`, margem, Math.min(y, 604));

  /* O selo de destaque, no mesmo canto do cartão. Desenhado por último para
     ficar por cima se o título for comprido. */
  if (projeto.featured) {
    p.font = `bold 24px ${MONO}`;
    const rotulo = dict.projects.featured.toUpperCase();
    const largo = p.measureText(rotulo).width + 28;
    p.fillStyle = "rgba(18,32,43,0.14)";
    p.fillRect(LARGURA - margem - largo, 62, largo, 42);
    p.fillStyle = "#12202b";
    p.fillText(rotulo, LARGURA - margem - largo + 14, 91);
  }
  return c;
}

/**
 * A folha do currículo como o painel mostra: foto, nome, a barra do cargo,
 * um filete, os dois primeiros parágrafos e os dois botões.
 */
function desenharCurriculo(
  p: Pincel,
  dict: Dictionary,
  nome: string,
  foto: CanvasImageSource | null,
) {
  const ALTURA = 1360;
  p.fillStyle = "#ece9e2";
  p.fillRect(0, 0, LARGURA, ALTURA);

  const LARGURA_FOTO = 216;
  const ALTURA_FOTO = 252;
  if (foto) {
    p.drawImage(foto, 90, 120, LARGURA_FOTO, ALTURA_FOTO);
  } else {
    p.fillStyle = "#d5d0c6";
    p.fillRect(90, 120, LARGURA_FOTO, ALTURA_FOTO);
  }

  const x = 90 + LARGURA_FOTO + 34;
  p.font = `bold 66px ${SANS}`;
  p.fillStyle = "#1a1a1a";
  p.fillText(nome, x, 190);

  p.font = `bold 24px ${MONO}`;
  const cargo = dict.hero.eyebrow.toUpperCase();
  const largoCargo = p.measureText(cargo).width + 32;
  p.fillStyle = "#1d4ed8";
  p.fillRect(x, 214, largoCargo, 42);
  p.fillStyle = "#ffffff";
  p.fillText(cargo, x + 16, 244);

  p.fillStyle = "#c9c4b8";
  p.fillRect(90, 424, LARGURA - 180, 2);

  p.font = `30px ${SANS}`;
  p.fillStyle = "#45433e";
  let y = 486;
  for (const paragrafo of dict.about.paragraphs.slice(0, 2)) {
    y = escrever(p, paragrafo, 90, y, LARGURA - 180, 44, 6) + 30;
  }

  /* Os mesmos dois botões do painel: baixar o currículo e o GitHub. */
  p.font = `bold 26px ${SANS}`;
  const largoBaixar = p.measureText(dict.nav.resume).width + 52;
  p.fillStyle = "#0a5648";
  p.fillRect(90, y + 16, largoBaixar, 56);
  p.fillStyle = "#ffffff";
  p.fillText(dict.nav.resume, 90 + 26, y + 52);

  const largoGithub = p.measureText("GitHub").width + 52;
  p.strokeStyle = "#c9c4b8";
  p.lineWidth = 2;
  p.strokeRect(90 + largoBaixar + 16, y + 16, largoGithub, 56);
  p.fillStyle = "#1a1a1a";
  p.fillText("GitHub", 90 + largoBaixar + 16 + 26, y + 52);
}

function folhaDoCurriculo(dict: Dictionary, nome: string) {
  const t = tela(1360);
  if (!t) return null;
  desenharCurriculo(t.p, dict, nome, null);
  return t.c;
}

/* ---------- aplicação ---------- */

/**
 * Troca o material das telas por uma cópia com a textura desenhada.
 *
 * A cópia é obrigatória: as telas compartilham o mesmo material na cena, e
 * pintar nele mudaria todas de uma vez. Por isso a função devolve o que criou
 * — quem monta a cena precisa descartar isso quando ela sair, senão cada
 * remontagem deixa texturas e programas de shader vivos na placa de vídeo.
 */
export type Descartaveis = { dispose: () => void }[];

function pintar(
  ilha: THREE.Object3D,
  nome: string,
  canvas: HTMLCanvasElement | null,
  lixo: Descartaveis,
  /** Telas brilham com o próprio desenho; papel e quadro branco, não. */
  acesa: boolean,
): THREE.CanvasTexture | null {
  if (!canvas) return null;
  const alvo = ilha.getObjectByName(nome) as THREE.Mesh | undefined;
  if (!alvo) return null;

  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 4;

  const base = alvo.material as THREE.MeshStandardMaterial;
  const material = base.clone();
  material.map = textura;
  if (acesa) {
    /* O emissivo original é uma cor chapada; trocado por branco, o brilho
       passa a vir do próprio desenho e a tela mostra o que está escrito em
       vez de um retângulo ciano. */
    material.emissive = new THREE.Color(0xffffff);
    material.emissiveMap = textura;
    material.emissiveIntensity = 0.85;
  } else {
    /* Papel não brilha. Alguns post-its do quadro usam o material das telas,
       que é emissivo — sem apagar isso o brilho lava o texto e a nota volta a
       ser um retângulo colorido. */
    material.emissive = new THREE.Color(0x000000);
    material.emissiveIntensity = 0;
    /* E a cor do material multiplica a textura: sem clarear, o desenho sai
       tingido do azul-escuro da tela e a nota fica preta. Nas telas acesas a
       cor escura fica de propósito, porque lá quem mostra o desenho é o
       emissivo. */
    material.color.set(0xffffff);
  }
  material.needsUpdate = true;
  alvo.material = material;

  lixo.push(textura, material);
  return textura;
}

/**
 * Carrega uma imagem e redesenha a textura quando ela chega.
 *
 * As fotos do site (o retrato do "Sobre", o ícone do mod) fazem parte do que
 * o painel mostra, então precisam aparecer na tela do 3D também. Só que
 * imagem chega depois, e a pintura é síncrona: o desenho nasce com o lugar
 * dela reservado e é refeito no `onload`.
 *
 * Não precisa pedir novo quadro: a cena roda em `frameloop="always"`, então
 * o `needsUpdate` é recolhido no quadro seguinte sozinho.
 */
function comImagem(
  src: string,
  textura: THREE.CanvasTexture | null,
  redesenhar: (imagem: HTMLImageElement) => void,
  lixo: Descartaveis,
) {
  if (!textura) return;
  const imagem = new Image();
  let vivo = true;
  imagem.onload = () => {
    if (!vivo) return;
    redesenhar(imagem);
    textura.needsUpdate = true;
  };
  imagem.src = src;
  lixo.push({ dispose: () => { vivo = false; } });
}

/**
 * Apaga a tela de um móvel enquanto o painel dela está aberto.
 *
 * A tela do 3D e o painel de HTML trazem a MESMA matéria. Enquanto o painel
 * cobria exatamente o retângulo da tela isso não aparecia, mas para o zoom
 * chegar perto a tela passa a ser maior que a janela: o painel é aparado nas
 * margens e o que sobra em volta é o mesmo texto, em outro tamanho, em dobro.
 *
 * Apagar resolve na raiz e ainda é o que um monitor faria — a matéria está
 * sendo lida em primeiro plano, não atrás. Devolve como desfazer.
 */
export function apagarTela(ilha: THREE.Object3D, nome: string): () => void {
  const alvo = ilha.getObjectByName(nome) as THREE.Mesh | undefined;
  if (!alvo) return () => {};

  const material = alvo.material as THREE.MeshStandardMaterial;
  const antes = {
    map: material.map,
    emissiveMap: material.emissiveMap,
    emissiveIntensity: material.emissiveIntensity,
    cor: material.color.clone(),
  };

  material.map = null;
  material.emissiveMap = null;
  /* Preta, não escura. A cor precisa ir junto do mapa: tirar só o mapa deixa
     aparecer a cor base do material — que no modelo do ultrawide é branca,
     porque toda a aparência dele vinha da textura — e a tela vira uma moldura
     cinza em volta do painel. Com a cor em preto e o emissivo desligado, o
     que sobra em volta é tela desligada, que é o que deve ser. */
  material.color.set(0x000000);
  material.emissiveIntensity = 0;
  material.needsUpdate = true;

  return () => {
    material.map = antes.map;
    material.emissiveMap = antes.emissiveMap;
    material.emissiveIntensity = antes.emissiveIntensity;
    material.color.copy(antes.cor);
    material.needsUpdate = true;
  };
}

export function aplicarTexturas(
  ilha: THREE.Object3D,
  dict: Dictionary,
  projetos: Project[],
  nome: string,
): Descartaveis {
  const lixo: Descartaveis = [];
  if (typeof document === "undefined") return lixo;

  /* As telas com foto são pintadas duas vezes: agora, com o lugar da imagem
     reservado, e de novo quando ela chega. O painel mostra a foto, então a
     tela do móvel também precisa mostrar. */
  const canvasSobre = telaSobre(dict);
  const texturaSobre = pintar(ilha, "monitor_left_screen", canvasSobre, lixo, true);
  comImagem("/victor.jpg", texturaSobre, (imagem) => {
    const p = canvasSobre?.getContext("2d");
    if (p) desenharSobre(p, dict, imagem);
  }, lixo);

  pintar(ilha, "monitor_right_screen", telaContato(dict), lixo, true);
  pintar(ilha, "macbook_screen", telaTerminal(), lixo, true);

  const canvasTv = telaTv(dict);
  const texturaTv = pintar(ilha, "tv_screen", canvasTv, lixo, true);
  comImagem(mod.preview, texturaTv, (imagem) => {
    const p = canvasTv?.getContext("2d");
    if (p) desenharTv(p, dict, imagem);
  }, lixo);

  pintar(ilha, "arcade_screen", telaArcade(), lixo, true);

  pintar(ilha, "whiteboard_panel", quadroStack(dict), lixo, false);
  /* A faixa azul do quadro carrega o mesmo chapéu que a barra azul do painel
     — "03 / Projetos", e não só "Projetos". */
  pintar(ilha, "project_board_header", faixaDoQuadro(dict.projects.eyebrow), lixo, true);
  pintar(ilha, "project_board_panel", corpoDoQuadro(dict), lixo, false);

  const canvasCurriculo = folhaDoCurriculo(dict, nome);
  const texturaCurriculo = pintar(ilha, "resume_sheet", canvasCurriculo, lixo, false);
  comImagem("/victor.jpg", texturaCurriculo, (imagem) => {
    const p = canvasCurriculo?.getContext("2d");
    if (p) desenharCurriculo(p, dict, nome, imagem);
  }, lixo);

  /* Os post-its do quadro recebem os títulos dos projetos: é o que faz o
     quadro ser dele e não um kanban genérico. A ordem preenche linha a linha
     nas três colunas, para o quadro ficar equilibrado — e a nota que sobrar
     sem projeto é escondida, em vez de ficar em branco pendurada. */
  const ORDEM_DAS_NOTAS: [number, number][] = [
    [1, 1], [2, 1], [3, 1],
    [1, 2], [2, 2], [3, 2],
    [1, 3], [3, 3],
  ];
  const cores = ["#a9dfe6", "#cdeef3", "#b7d8c4"];

  /* As tarjas de coluna saíram de cena. Elas traziam contas que o painel não
     mostra — quantos projetos, de que anos, quantos com código aberto — e o
     quadro tem de dizer o mesmo que o painel. O espaço que elas ocupavam é
     onde o título e a chamada agora ficam. */
  for (let i = 0; i < 3; i++) {
    const tarja = ilha.getObjectByName(`project_column_label_${i + 1}`);
    if (!tarja) continue;
    tarja.visible = false;
    lixo.push({ dispose: () => { tarja.visible = true; } });
  }

  /* As notas viram os cartões do painel: mesma grade de três colunas por duas
     fileiras, mesmo tamanho relativo, e retas.
     A cena as desenha com 0,34 x 0,22, espalhadas e com uma inclinação de
     "colado com a mão" — bonito como post-it, mas o quadro tem de mostrar o
     que o painel mostra, e lá são cartões grandes, alinhados e preenchendo a
     grade. Como `cena.ts` é gerado e não deve ser reescrito, o ajuste é feito
     aqui, na escala e na posição, e desfeito no descarte. */
  const LARGURA_CARTAO = 0.553;
  const ALTURA_CARTAO = 0.332;
  const COLUNAS = [-0.6035, 0, 0.6035];
  const FILEIRAS = [1.423, 1.041];

  ORDEM_DAS_NOTAS.forEach(([coluna, linha], i) => {
    const nota = ilha.getObjectByName(`project_note_${coluna}_${linha}`);
    if (!nota) return;
    const projeto = projetos[i];

    if (!projeto) {
      nota.visible = false;
      lixo.push({ dispose: () => { nota.visible = true; } });
      return;
    }

    const escalaAntes = nota.scale.clone();
    const posicaoAntes = nota.position.clone();
    const giroAntes = nota.rotation.z;
    nota.scale.set(LARGURA_CARTAO / 0.34, ALTURA_CARTAO / 0.22, 1);
    nota.position.set(COLUNAS[coluna - 1]!, FILEIRAS[linha - 1] ?? nota.position.y, 0.045);
    nota.rotation.z = 0;
    lixo.push({
      dispose: () => {
        nota.scale.copy(escalaAntes);
        nota.position.copy(posicaoAntes);
        nota.rotation.z = giroAntes;
      },
    });

    pintar(
      ilha,
      `project_note_${coluna}_${linha}`,
      postIt(projeto, dict, cores[(coluna - 1) % cores.length]!),
      lixo,
      false,
    );
  });

  return lixo;
}
