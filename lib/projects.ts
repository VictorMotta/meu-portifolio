import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import { marked } from "marked";

import type { Locale } from "@/content/site";

/**
 * Os projetos vem de arquivos, nao de banco.
 *
 * Uma pasta so, em public/projetos/:
 *
 *   plataforma-corretora.md        texto em portugues — E O QUE CRIA O PROJETO
 *   plataforma-corretora.en.md     traducao (opcional; sem ela, /en mostra o PT)
 *   plataforma-corretora_1.webp    imagens do carrossel, na ordem
 *   plataforma-corretora_2.webp    a _1 tambem e a capa no card da home
 *
 * O nome-base amarra tudo. Adicionar um projeto = adicionar um .md e as
 * imagens; nao ha nenhum indice para atualizar depois.
 *
 * Como o site e estatico, esta leitura acontece no build: arquivo novo so
 * aparece no ar depois de commit e deploy.
 */

const PASTA = path.join(process.cwd(), "public", "projetos");
const URL_BASE = "/projetos";

const EXTENSOES_IMAGEM = [".webp", ".avif", ".png", ".jpg", ".jpeg"];

export type ProjectImage = {
  src: string;
  alt: string;
};

export type Project = {
  slug: string;
  title: string;
  /** Primeiro paragrafo do markdown. Vai no card. */
  summary: string;
  /** Resto do texto, ja convertido para HTML. Vai na pagina de detalhe. */
  bodyHtml: string;
  role: string;
  year: number;
  stack: string[];
  repo?: string;
  live?: string;
  featured: boolean;
  /** _1 .. _N em ordem numerica. A primeira e a capa. */
  images: ProjectImage[];
};

type Frontmatter = {
  year?: number;
  featured?: boolean;
  stack?: string[];
  role?: string;
  repo?: string;
  live?: string;
  /** Descricao de cada imagem, na mesma ordem dos arquivos _1, _2... */
  alts?: string[];
};

function lerPasta(): string[] {
  try {
    return fs.readdirSync(PASTA);
  } catch {
    /* Pasta ainda nao existe: o site sobe com a secao de projetos vazia em
       vez de quebrar o build. */
    return [];
  }
}

/**
 * Imagens do projeto, em ordem numerica de verdade.
 *
 * Ordenacao alfabetica poria _10 antes de _2 — por isso comparamos o numero,
 * nao a string.
 */
function imagensDo(slug: string, arquivos: string[], alts: string[]): ProjectImage[] {
  const encontradas: { numero: number; arquivo: string }[] = [];

  for (const arquivo of arquivos) {
    /* A extensao original serve para cortar o nome; a versao em minuscula so
       para comparar. Passar a minuscula ao basename faria ele nao reconhecer
       "foto.PNG" (o corte e sensivel a maiuscula) e a imagem sumiria calada. */
    const ext = path.extname(arquivo);
    if (!EXTENSOES_IMAGEM.includes(ext.toLowerCase())) continue;

    const base = path.basename(arquivo, ext);
    const casa = base.match(/^(.+)_(\d+)$/);
    if (!casa || casa[1] !== slug) continue;

    encontradas.push({ numero: Number(casa[2]), arquivo });
  }

  encontradas.sort((a, b) => a.numero - b.numero);

  return encontradas.map(({ arquivo }, indice) => ({
    src: `${URL_BASE}/${arquivo}`,
    /* Sem alt escrito no frontmatter sobra uma descricao generica: pior que
       um texto de verdade, melhor que alt vazio numa imagem informativa. */
    alt:
      alts[indice]?.trim() ||
      `Imagem ${indice + 1} de ${encontradas.length} do projeto ${slug}`,
  }));
}

/** Separa o `# Titulo`, o primeiro paragrafo e o resto do corpo. */
function partirCorpo(markdown: string): {
  title: string;
  summary: string;
  resto: string;
} {
  const linhas = markdown.trim().split("\n");
  let title = "";
  let i = 0;

  /* O primeiro "# " e o titulo — assim o nome do projeto nao precisa ser
     repetido no frontmatter. */
  while (i < linhas.length && linhas[i]!.trim() === "") i++;
  if (linhas[i]?.startsWith("# ")) {
    title = linhas[i]!.slice(2).trim();
    i++;
  }

  const restoLinhas = linhas.slice(i);
  const texto = restoLinhas.join("\n").trim();

  /* Primeiro paragrafo = resumo do card. Paragrafos sao separados por linha
     em branco. */
  const quebra = texto.indexOf("\n\n");
  const summary = (quebra === -1 ? texto : texto.slice(0, quebra)).trim();
  const resto = quebra === -1 ? "" : texto.slice(quebra).trim();

  return { title, summary, resto };
}

function lerArquivo(slug: string, locale: Locale, arquivos: string[]): Project | null {
  const nomePt = `${slug}.md`;
  const nomeEn = `${slug}.en.md`;

  /* Portugues e a fonte da verdade: define o projeto e serve de reserva
     quando a traducao ainda nao existe. */
  const preferido = locale === "en" && arquivos.includes(nomeEn) ? nomeEn : nomePt;
  if (!arquivos.includes(preferido)) return null;

  const bruto = fs.readFileSync(path.join(PASTA, preferido), "utf8");
  const { data, content } = matter(bruto);
  const meta = data as Frontmatter;

  /* Ano, stack e links so existem no arquivo em portugues — a traducao nao
     precisa repetir metadado que nao muda de idioma. */
  const metaPt =
    preferido === nomePt
      ? meta
      : (matter(fs.readFileSync(path.join(PASTA, nomePt), "utf8")).data as Frontmatter);

  const { title, summary, resto } = partirCorpo(content);

  return {
    slug,
    title: title || slug,
    summary,
    bodyHtml: resto ? (marked.parse(resto, { async: false }) as string) : "",
    role: meta.role ?? metaPt.role ?? "",
    year: metaPt.year ?? new Date().getFullYear(),
    stack: metaPt.stack ?? [],
    repo: metaPt.repo,
    live: metaPt.live,
    featured: metaPt.featured ?? false,
    images: imagensDo(slug, arquivos, meta.alts ?? metaPt.alts ?? []),
  };
}

/** Todos os projetos, do mais recente para o mais antigo. */
export function getProjects(locale: Locale): Project[] {
  const arquivos = lerPasta();

  const slugs = arquivos
    /* `.en.md` e traducao de um projeto existente, nao um projeto novo. */
    .filter((f) => f.endsWith(".md") && !f.endsWith(".en.md"))
    .map((f) => path.basename(f, ".md"));

  return slugs
    .map((slug) => lerArquivo(slug, locale, arquivos))
    .filter((p): p is Project => p !== null)
    .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
}

export function getProject(locale: Locale, slug: string): Project | undefined {
  return getProjects(locale).find((p) => p.slug === slug);
}

/** Slugs para o generateStaticParams das paginas de detalhe. */
export function getProjectSlugs(): string[] {
  return lerPasta()
    .filter((f) => f.endsWith(".md") && !f.endsWith(".en.md"))
    .map((f) => path.basename(f, ".md"));
}
