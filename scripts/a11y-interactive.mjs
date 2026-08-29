/**
 * Testa os estados que uma auditoria de carga de pagina nao alcanca:
 * formulario com erro, menu mobile aberto, navegacao por teclado e a
 * armadilha de foco.
 *
 * Uso:  node scripts/a11y-interactive.mjs [url-base]
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

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`  ${ok ? "OK   " : "FALHA"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});

/* ---------- 1. Formulario: erros de validacao acessiveis ---------- */
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/pt`, { waitUntil: "networkidle0" });
  await page.evaluate(() =>
    document.getElementById("contato")?.scrollIntoView(),
  );
  await new Promise((r) => setTimeout(r, 600));

  await page.click('button[type="submit"]');
  await new Promise((r) => setTimeout(r, 600));

  const state = await page.evaluate(() => {
    const invalid = Array.from(
      document.querySelectorAll('[aria-invalid="true"]'),
    );
    return {
      invalidCount: invalid.length,
      /* Cada campo invalido precisa apontar para uma mensagem que exista
         de fato no DOM — aria-describedby quebrado e pior que nenhum. */
      describedByResolves: invalid.every((el) => {
        const ids = (el.getAttribute("aria-describedby") ?? "").split(/\s+/);
        return ids.some((id) => id && document.getElementById(id));
      }),
      hasAlertRole: document.querySelectorAll('[role="alert"]').length > 0,
      focusedId: document.activeElement?.id ?? null,
      everyFieldHasLabel: Array.from(
        document.querySelectorAll("#contato input, #contato select, #contato textarea"),
      )
        .filter((el) => el.type !== "hidden" && el.id !== "website")
        .every((el) => document.querySelector(`label[for="${el.id}"]`)),
    };
  });

  console.log("\nFormulario com erros de validacao");
  check("campos invalidos marcados com aria-invalid", state.invalidCount >= 2,
    `${state.invalidCount} campo(s)`);
  check("aria-describedby aponta para elemento existente", state.describedByResolves);
  check("erro anunciado com role=alert", state.hasAlertRole);
  check("foco levado ao primeiro campo invalido", state.focusedId === "name",
    `foco em "${state.focusedId}"`);
  check("todo campo visivel tem <label for>", state.everyFieldHasLabel);

  await page.evaluate(axeSource);
  const res = await page.evaluate(async () =>
    // @ts-expect-error axe global
    await axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }),
  );
  check("axe sem violacoes no formulario com erro", res.violations.length === 0,
    res.violations.map((v) => v.id).join(", "));

  await page.close();
}

/* ---------- 2. Menu mobile: dialog, armadilha de foco, Esc ---------- */
{
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await page.goto(`${BASE}/pt`, { waitUntil: "networkidle0" });

  console.log("\nMenu mobile");

  await page.click('button[aria-controls="menu-mobile"]');
  await new Promise((r) => setTimeout(r, 400));

  const opened = await page.evaluate(() => {
    const panel = document.getElementById("menu-mobile");
    const trigger = document.querySelector('[aria-controls="menu-mobile"]');
    return {
      isDialog: panel?.getAttribute("role") === "dialog",
      isModal: panel?.getAttribute("aria-modal") === "true",
      expanded: trigger?.getAttribute("aria-expanded") === "true",
      focusInsidePanel: panel?.contains(document.activeElement) ?? false,
      bodyLocked: document.body.style.overflow === "hidden",
    };
  });
  check("painel e role=dialog", opened.isDialog);
  check("painel e aria-modal", opened.isModal);
  check("gatilho marca aria-expanded=true", opened.expanded);
  check("foco entra no painel ao abrir", opened.focusInsidePanel);
  check("rolagem do fundo travada", opened.bodyLocked);

  /* Tabula muito alem do numero de itens: se o foco escapar do painel em
     algum momento, a armadilha esta furada. */
  let escaped = false;
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Tab");
    const inside = await page.evaluate(
      () =>
        document
          .getElementById("menu-mobile")
          ?.contains(document.activeElement) ?? false,
    );
    if (!inside) escaped = true;
  }
  check("Tab circula dentro do painel (armadilha de foco)", !escaped);

  await page.keyboard.press("Escape");
  await new Promise((r) => setTimeout(r, 400));
  const closed = await page.evaluate(() => ({
    gone: document.getElementById("menu-mobile") === null,
    focusOnTrigger:
      document.activeElement?.getAttribute("aria-controls") === "menu-mobile",
    bodyUnlocked: document.body.style.overflow !== "hidden",
  }));
  check("Esc fecha o menu", closed.gone);
  check("foco volta ao botao que abriu", closed.focusOnTrigger);
  check("rolagem do fundo liberada", closed.bodyUnlocked);

  await page.close();
}

/* ---------- 3. Skip link ---------- */
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/pt`, { waitUntil: "networkidle0" });

  console.log("\nSkip link e ordem de foco");

  await page.keyboard.press("Tab");
  const first = await page.evaluate(() => {
    const el = document.activeElement;
    const rect = el?.getBoundingClientRect();
    return {
      href: el?.getAttribute("href"),
      /* Um skip link que continua fora da tela depois de focado nao serve
         para nada: quem enxerga precisa ver onde o foco esta. */
      visible: !!rect && rect.top >= 0 && rect.left >= 0,
    };
  });
  check("primeiro Tab chega no skip link", first.href === "#conteudo");
  check("skip link fica visivel ao receber foco", first.visible);

  await page.close();
}

await browser.close();
console.log(
  failures === 0
    ? "\nTodos os testes de interacao passaram."
    : `\n${failures} falha(s).`,
);
process.exit(failures === 0 ? 0 : 1);
