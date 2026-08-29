/**
 * Auditoria de acessibilidade contra o site rodando.
 *
 * Roda o axe-core em cada pagina, nos dois idiomas e nos dois temas, e sai
 * com codigo != 0 se achar violacao — da para plugar num CI depois.
 *
 * Uso:  node scripts/a11y.mjs [url-base]     (padrao: http://localhost:3000)
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import puppeteer from "puppeteer-core";

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const BASE = process.argv[2] ?? "http://localhost:3000";
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const PAGES = [
  "/pt",
  "/en",
  "/pt/projects/plataforma-corretora",
  "/en/projects/plataforma-corretora",
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
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(BASE + path, { waitUntil: "networkidle0" });

    /* Fixa o tema e rola a pagina inteira, para que os elementos com
       whileInView terminem visiveis — um elemento em opacity:0 seria pulado
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
      await new Promise((r) => setTimeout(r, 400));
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
