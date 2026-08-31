/**
 * Auditoria de acessibilidade contra o site rodando.
 *
 * Roda o axe-core em cada pagina, nos dois idiomas e nos dois temas, e sai
 * com codigo != 0 se achar violacao, da para plugar num CI depois.
 *
 * Uso:  node scripts/a11y.mjs [url-base]     (padrao: http://localhost:3000)
 */
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import puppeteer from "puppeteer-core";

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const BASE = process.argv[2] ?? "http://localhost:3000";
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/* Descobre os projetos lendo a pasta, em vez de listar slug na mão: assim o
   script não quebra quando um projeto é adicionado ou removido. */
const slugs = readdirSync("public/projetos")
  .filter((f) => f.endsWith(".md") && !f.endsWith(".en.md"))
  .map((f) => f.replace(/\.md$/, ""));

const PAGES = [
  "/pt",
  "/en",
  ...slugs.slice(0, 2).flatMap((s) => [`/pt/projects/${s}`, `/en/projects/${s}`]),
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});

let totalViolations = 0;

for (const theme of ["dark", "light"]) {
  for (const path of PAGES) {
    const page = await browser.newPage();
    /* Desliga a ilha e o mundo 3D: com WebGL rodando a página nunca fica
       ociosa no renderizador por software do headless, e o axe não mede
       contraste contra canvas de qualquer forma. O contraste do vidro é
       conferido à parte, por cálculo. Desligar a ilha também é o que faz
       este roteiro auditar a página rolável, que é a versão que precisa
       funcionar para quem não tem 3D. A ilha tem auditoria própria. */
    await page.evaluateOnNewDocument(() => {
      try { localStorage.setItem("mundo3d", "off"); localStorage.setItem("ilha", "off"); } catch {}
    });
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(BASE + path, { waitUntil: "networkidle2", timeout: 60000 });

    /* Fixa o tema e rola a pagina inteira, para que os elementos com
       whileInView terminem visiveis, um elemento em opacity:0 seria pulado
       pelo axe e a auditoria passaria sem ter olhado nada. */
    await page.evaluate((chosen) => {
      document.documentElement.setAttribute("data-theme", chosen);
      localStorage.setItem("theme", chosen);
    }, theme);

    await page.evaluate(async () => {
      const step = window.innerHeight / 2;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);

      /* Espera o fade do Reveal terminar antes de medir. Uma pausa fixa nao
         basta: as secoes do fim da pagina so comecam a aparecer no ultimo
         passo da rolagem, e o axe pegava uma delas em opacity 0,6 — o
         contraste sai da mistura com o fundo e a auditoria acusava falha em
         cor que passa de sobra. Uma vez a cada quatro execucoes, o que e pior
         do que falhar sempre: parece bug do site. */
      const meio = () =>
        [...document.querySelectorAll("body *")].some((el) => {
          const o = Number(getComputedStyle(el).opacity);
          return o > 0.001 && o < 0.999;
        });

      const limite = Date.now() + 5000;
      while (meio() && Date.now() < limite) {
        await new Promise((r) => setTimeout(r, 100));
      }
      await new Promise((r) => setTimeout(r, 200));
    });

    await page.evaluate(axeSource);
    const results = await page.evaluate(async () => {
      // @ts-expect-error axe entra no escopo global pelo script acima
      return await axe.run(document, {
        runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"],
      });
    });

    const label = `${theme.padEnd(5)} ${path}`;
    if (results.violations.length === 0) {
      console.log(`  OK    ${label}`);
    } else {
      totalViolations += results.violations.length;
      console.log(`  FALHA ${label}`);
      for (const v of results.violations) {
        console.log(`        [${v.impact}] ${v.id}: ${v.help}`);
        for (const node of v.nodes.slice(0, 3)) {
          console.log(`          ${node.html.slice(0, 120)}`);
        }
      }
    }

    await page.close();
  }
}

await browser.close();

console.log(
  totalViolations === 0
    ? "\nNenhuma violacao de acessibilidade encontrada."
    : `\n${totalViolations} violacao(oes) encontrada(s).`,
);
process.exit(totalViolations === 0 ? 0 : 1);
