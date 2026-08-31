import fs from "node:fs";
import path from "node:path";

import { marked } from "marked";

import type { Locale } from "@/content/site";

/**
 * Manuais dos mods, em Markdown, servidos pelo próprio site.
 *
 * Antes o botão "Manual completo" mandava o visitante para um artifact no
 * claude.ai. Ninguém deveria sair do portfólio para ler documentação do
 * trabalho de quem fez o portfólio.
 *
 * Mesma convenção dos projetos: <slug>.md em português, <slug>.en.md como
 * tradução opcional com reserva no português.
 */

const PASTA = path.join(process.cwd(), "content", "mods");

export type Mod = {
  slug: string;
  bodyHtml: string;
};

function lerPasta(): string[] {
  try {
    return fs.readdirSync(PASTA);
  } catch {
    return [];
  }
}

export function getModSlugs(): string[] {
  return lerPasta()
    .filter((f) => f.endsWith(".md") && !f.endsWith(".en.md"))
    .map((f) => path.basename(f, ".md"));
}

export function getMod(locale: Locale, slug: string): Mod | undefined {
  const arquivos = lerPasta();
  const nomePt = `${slug}.md`;
  const nomeEn = `${slug}.en.md`;

  const escolhido = locale === "en" && arquivos.includes(nomeEn) ? nomeEn : nomePt;
  if (!arquivos.includes(escolhido)) return undefined;

  const bruto = fs.readFileSync(path.join(PASTA, escolhido), "utf8");
  return {
    slug,
    bodyHtml: marked.parse(bruto, { async: false }) as string,
  };
}
