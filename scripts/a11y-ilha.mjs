/**
 * Auditoria de acessibilidade da ilha em 3D.
 *
 * O roteiro `a11y.mjs` desliga a ilha de propósito, para medir a página
 * rolável — que é a versão que precisa funcionar para quem não tem WebGL.
 * Este aqui faz o contrário: entra na ilha e roda o axe em cada parada da
 * câmera, porque o conteúdo dos painéis só existe depois que a câmera chega.
 *
 * Precisa do servidor de desenvolvimento no ar (`npm run dev`).
 */
import puppeteer from "puppeteer-core";
import { readFileSync } from "node:fs";
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");

/* As duas paletas: cada superfície da ilha tem cor própria, e o painel de
   contato herda os tokens do tema. Auditar só o escuro deixaria metade das
   combinações sem medida. */
const TEMAS = ["dark", "light"];

let falhas = 0;

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--use-gl=angle","--use-angle=metal"],
  defaultViewport: { width: 1440, height: 900 },
});
for (const tema of TEMAS) {
  const p = await b.newPage();
  p.on("pageerror", e => console.log("ERRO JS:", e.message.slice(0,200)));
  await p.evaluateOnNewDocument((t) => { try { localStorage.setItem("theme", t); } catch {} }, tema);
  await p.goto("http://localhost:3000/pt", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  /* Os rótulos vêm acentuados na interface; a busca compara sem acento para
     o roteiro não depender da grafia dos botões. */
  const semAcento = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  /* "caso" não é uma parada da câmera: é o projeto aberto dentro do quadro,
     que troca todo o conteúdo do painel e precisa da própria medida. */
  for (const alvo of ["geral", "sobre", "stack", "projetos", "caso", "mods", "jogos", "contato", "curriculo"]) {
    /* O fliperama cai no caminho comum abaixo, como as outras paradas: ele
       ganhou botao na navegacao.

       Antes chegava-se nele clicando no gabinete em coordenada fixa, e aquilo
       quebrou duas vezes — uma quando o enquadramento da vista geral mudou e
       outra quando a elevacao inicial da camera mudou. Nas duas o roteiro
       acusou "violacao" onde nao havia nenhuma: o pixel e que tinha andado.
       Um roteiro de acessibilidade deve medir o caminho ACESSIVEL, e o caminho
       acessivel agora e o botao. O clique no gabinete em 3D continua
       funcionando; ele so nao e mais o que este roteiro verifica. */
    if (alvo === "caso") {
      const abriu = await p.evaluate(() => {
        const b = [...document.querySelectorAll('[role="dialog"] ul button')][0];
        if (!b) return false;
        b.click();
        return true;
      });
      if (!abriu) { console.log("   !! nenhum projeto para abrir"); continue; }
      await new Promise(r => setTimeout(r, 700));
      await p.evaluate(axe);
      const rc = await p.evaluate(async () => {
        const res = await window.axe.run(document, { resultTypes: ["violations"] });
        return res.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length,
          alvo: v.nodes.slice(0,2).map(n => n.target.join(" ")) }));
      });
      console.log(`  ${rc.length === 0 ? "OK   " : "FALHA"} ${tema.padEnd(5)} caso${rc.length ? ` — ${rc.length} violacao(oes)` : ""}`);
      for (const v of rc) console.log(`         [${v.impact}] ${v.id} x${v.n}  ${v.alvo.join(" | ").slice(0,120)}`);
      if (rc.length) falhas += rc.length;
      continue;
    }
    if (alvo !== "geral") {
      const achou = await p.evaluate((a, semAcentoFonte) => {
        const limpar = new Function("return " + semAcentoFonte)();
        const b = [...document.querySelectorAll("nav button")].find(x => limpar(x.textContent.trim()) === a);
        if (!b) return false;
        b.click();
        return true;
      }, alvo, semAcento.toString());
      if (!achou) { console.log(`   !! botao "${alvo}" nao encontrado`); continue; }
      await new Promise(r => setTimeout(r, 2400));
    }
    await p.evaluate(axe);
    const r = await p.evaluate(async () => {
      const res = await window.axe.run(document, { resultTypes: ["violations"] });
      return res.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length,
        alvo: v.nodes.slice(0,2).map(n => n.target.join(" ")) }));
    });
    const marca = r.length === 0 ? "OK   " : "FALHA";
    console.log(`  ${marca} ${tema.padEnd(5)} ${alvo}${r.length ? ` — ${r.length} violacao(oes)` : ""}`);
    for (const v of r) console.log(`         [${v.impact}] ${v.id} x${v.n}  ${v.alvo.join(" | ").slice(0,120)}`);
    if (r.length) falhas += r.length;
  }
  await p.close();
}

if (falhas) {
  console.log(`\n${falhas} violacao(oes) na ilha.`);
  process.exitCode = 1;
} else {
  console.log("\nNenhuma violacao de acessibilidade na ilha.");
}

await b.close();
