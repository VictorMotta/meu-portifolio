"use client";

import { ArrowLeft, ArrowUpRight, Download } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { ContactForm } from "@/components/form/contact-form";
import { ProjectCarousel } from "@/components/ui/project-carousel";
import { Github } from "@/components/ui/brand-icons";
import { Tag } from "@/components/ui/tag";
import { mod } from "@/content/hobby";
import { format, type Dictionary } from "@/content/i18n";
import { site, type Locale } from "@/content/site";
import { stack, stackGroupOrder } from "@/content/stack";
import type { Project } from "@/lib/projects";

/**
 * O conteúdo de cada parada da ilha, escrito para a superfície em que pousa.
 *
 * Não são versões genéricas: o Sobre é uma tela de computador, a Stack é
 * anotação de marcador numa lousa, os Projetos são post-its colados no quadro
 * e o Currículo é uma folha no cavalete. As cores vêm todas de variáveis que
 * a superfície define em `globals.css`, então o mesmo componente funciona no
 * tema claro e no escuro sem repetir paleta aqui.
 */

/* Marcadores da lousa e cores de post-it, tirados da paleta da própria cena
   e clareados até o texto escuro passar em AA. Os contrastes estão anotados
   no bloco `.sup-quadro` do globals.css. */
const MARCADORES = ["#0e7490", "#1d4ed8", "#166534", "#7c2d12"];
const CORES_POSTIT = ["#a9dfe6", "#cdeef3", "#b7d8c4"];

/* ---------- peças de tela ---------- */

function TituloTela({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-xl leading-tight text-[var(--tinta)] sm:text-2xl">
      {children}
    </h2>
  );
}

function SobretituloTela({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-[var(--realce)]">
      {children}
    </p>
  );
}

/* ---------- Sobre: tela do monitor da esquerda ---------- */

export function PainelSobre({ dict }: { dict: Dictionary }) {
  const t = dict.about;
  return (
    /* Preenche a tela do monitor: `min-h-full` na coluna e `flex-1` no miolo,
       que é onde a sobra de altura deve ficar. Sem isso o conteúdo terminava
       na metade e sobrava meia tela de vazio embaixo — numa tela de monitor
       isso não parece sóbrio, parece que faltou carregar.

       `min-h-full` e não `h-full` pelo mesmo motivo do currículo: em tela
       estreita o painel vira folha alta, e aí o conteúdo cresce e o pai rola
       em vez de ser aparado. */
    <div className="flex min-h-full flex-col gap-5">
      <div>
        <SobretituloTela>{t.eyebrow}</SobretituloTela>
        <TituloTela>{t.title}</TituloTela>
      </div>

      <div className="flex flex-1 flex-row items-start gap-4 sm:gap-6 lg:gap-8">
        {/* A foto INTEIRA, e não um recorte: a proporção do elemento é a do
            arquivo (2278x4050), então não há o que cortar. Antes ela era um
            quadrado de 7,5rem e perdia metade da pessoa — aqui a tela é do
            monitor ultrawide, larga e sobrando altura, e uma foto em pé é
            justamente o que ocupa essa sobra.

            AO LADO do texto em toda largura, e não empilhada embaixo no
            celular. Uma foto em pé de 12rem tem 21rem de altura: empilhada num
            painel de celular ela sozinha ocupava 64% do que cabe na tela, e
            abrir o "Sobre" mostrava um retrato — o texto começava depois de
            duas telas de rolagem. Ao lado, com 6rem, ela cabe na primeira
            dobra junto com o começo do texto, que é o que a seção veio dizer.

            Os três tamanhos seguem as três larguras de painel: folha de
            celular, folha larga e tela de monitor. */}
        <Image
          src="/victor.png"
          alt={t.photoAlt}
          width={2278}
          height={4050}
          sizes="(min-width: 1024px) 16rem, (min-width: 640px) 12rem, 6rem"
          className="w-24 shrink-0 rounded-lg object-contain ring-1 ring-white/10 sm:w-48 lg:w-64"
        />
        {/* Duas colunas a partir de `lg`, e fonte maior. A tela do monitor tem
            quase 1900px de largura útil: em coluna única e `text-sm` o texto
            virava quatro linhas soltas no topo de um campo vazio, e cada linha
            atravessava a tela inteira — cansativo de ler e feio de ver. */}
        <div className="min-w-0 flex-1 columns-1 gap-8 text-base leading-relaxed text-[var(--tinta-fraca)] lg:columns-2 lg:text-lg">
          {t.paragraphs.map((p) => (
            <p key={p.slice(0, 24)} className="mb-4 break-inside-avoid">
              {p}
            </p>
          ))}
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-3 border-t border-[var(--risco)] pt-4">
        {[
          [t.stats.experience, "4+"],
          [t.stats.projects, "12"],
          [t.stats.focus, t.stats.focusValue],
        ].map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt className="font-mono text-[0.68rem] uppercase tracking-wider text-[var(--tinta-tenue)]">
              {rotulo}
            </dt>
            <dd className="font-display text-xl text-[var(--tinta)]">{valor}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ---------- Stack: anotação de marcador na lousa ---------- */

export function PainelStack({ dict }: { dict: Dictionary }) {
  const t = dict.stack;
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-[var(--realce)]">
          {t.eyebrow}
        </p>
        {/* O traço largo por baixo é a caneta de quadro branco: some no
            `prefers-reduced-motion`? não — é estático, e é o que dá a leitura
            de "escrito à mão" sem trocar a fonte por uma cursiva ilegível. */}
        <h2 className="font-display text-xl leading-tight text-[var(--tinta)] sm:text-2xl">
          <span
            className="marca-texto"
            style={{ "--cor-marca": MARCADORES[1] } as React.CSSProperties}
          >
            {t.title}
          </span>
        </h2>
        <p className="mt-2 text-sm text-[var(--tinta-fraca)]">{t.lead}</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {stackGroupOrder.map((grupo, i) => (
          <section key={grupo}>
            <h3
              className="mb-2 inline-block font-mono text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--tinta)]"
              style={
                {
                  borderBottom: `2px solid ${MARCADORES[i % MARCADORES.length]}`,
                } as React.CSSProperties
              }
            >
              {t.groups[grupo]}
            </h3>
            <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
              {stack[grupo].map((skill) => (
                <li
                  key={skill.name}
                  className="inline-flex items-center gap-1.5 text-sm text-[var(--tinta)]"
                >
                  {/* A cor da tecnologia entra como um ponto, não como fundo:
                      fundo colorido derrubaria o contraste do texto. */}
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full"
                    style={{ background: skill.cor }}
                  />
                  {skill.name}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

/* ---------- Projetos: post-its colados no quadro ---------- */

export function PainelProjetos({
  dict,
  locale,
  projetos,
  aberto,
  aoAbrir,
  aoVoltar,
}: {
  dict: Dictionary;
  locale: Locale;
  projetos: Project[];
  /** Slug do projeto aberto, ou null para a lista de post-its. */
  aberto: string | null;
  aoAbrir: (slug: string) => void;
  aoVoltar: () => void;
}) {
  const t = dict.projects;
  const projeto = aberto ? projetos.find((p) => p.slug === aberto) : undefined;

  return (
    <div className="space-y-4">
      {/* Faixa de cabeçalho, igual à barra azul que o quadro tem no 3D. */}
      <div className="-mx-5 -mt-5 mb-1 bg-[#1d4ed8] px-5 py-2 sm:-mx-8 sm:-mt-7 sm:px-8">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-white">
          {t.eyebrow}
        </p>
      </div>

      {projeto ? (
        <CasoNoQuadro
          projeto={projeto}
          dict={dict}
          locale={locale}
          aoVoltar={aoVoltar}
        />
      ) : (
        <ListaDeProjetos dict={dict} projetos={projetos} aoAbrir={aoAbrir} />
      )}
    </div>
  );
}

function ListaDeProjetos({
  dict,
  projetos,
  aoAbrir,
}: {
  dict: Dictionary;
  projetos: Project[];
  aoAbrir: (slug: string) => void;
}) {
  const t = dict.projects;

  if (projetos.length === 0) {
    return <p className="text-sm text-[var(--tinta-fraca)]">{t.empty}</p>;
  }

  return (
    <>
      <div>
        <h2 className="font-display text-xl leading-tight text-[var(--tinta)] sm:text-2xl">
          {t.title}
        </h2>
        <p className="mt-1 text-sm text-[var(--tinta-fraca)]">{t.lead}</p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projetos.map((p, i) => (
          <li key={p.slug} className={`postit-${(i % 4) + 1}`}>
            {/* Botão, e não link: o caso abre aqui mesmo, no quadro. A página
                própria de cada projeto continua existindo — é ela que o
                Google indexa e que a versão rolável do site usa. */}
            <button
              type="button"
              onClick={() => aoAbrir(p.slug)}
              className="postit group flex h-full w-full flex-col gap-2 rounded-[2px] p-3 text-left transition hover:-translate-y-0.5 hover:shadow-[0_10px_16px_-8px_rgba(0,0,0,0.5)]"
              style={
                {
                  "--cor-postit": CORES_POSTIT[i % CORES_POSTIT.length],
                } as React.CSSProperties
              }
            >
              <span className="flex w-full items-start justify-between gap-2">
                <span className="font-display text-[0.95rem] leading-snug">
                  {p.title}
                </span>
                {p.featured ? (
                  <span className="shrink-0 rounded-[2px] bg-black/15 px-1.5 py-0.5 font-mono text-[0.58rem] uppercase tracking-wider">
                    {t.featured}
                  </span>
                ) : null}
              </span>
              <span className="line-clamp-3 text-xs leading-relaxed opacity-80">
                {p.summary}
              </span>
              <span className="mt-auto pt-1 font-mono text-[0.65rem] opacity-70">
                {p.stack.slice(0, 4).join(" · ")}
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[0.68rem] font-medium">
                {t.viewCase}
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-3.5 transition group-hover:translate-x-0.5"
                />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function CasoNoQuadro({
  projeto,
  dict,
  locale,
  aoVoltar,
}: {
  projeto: Project;
  dict: Dictionary;
  locale: Locale;
  aoVoltar: () => void;
}) {
  const t = dict.projects;
  const titulo = useRef<HTMLHeadingElement>(null);

  /* O foco vai para o título do caso: quem navega por teclado ou leitor de
     tela precisa saber que o conteúdo do quadro trocou. */
  useEffect(() => {
    titulo.current?.focus();
  }, [projeto.slug]);

  return (
    <article className="folha-projeto mx-auto max-w-3xl rounded-[3px] p-5 sm:p-7">
      {/* Grudado no topo: lendo o caso até o fim, a volta para os post-its
          continua ao alcance sem precisar rolar tudo de novo. */}
      <div className="sticky -top-5 z-10 -mx-5 -mt-5 mb-4 bg-[#eef3f6] px-5 py-3 sm:-top-7 sm:-mx-7 sm:-mt-7 sm:px-7">
        <button
          type="button"
          onClick={aoVoltar}
          className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--realce)] transition hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.backToProjects}
        </button>
      </div>

      <h2
        ref={titulo}
        tabIndex={-1}
        className="font-display text-2xl leading-tight outline-none sm:text-3xl"
      >
        {projeto.title}
      </h2>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-[var(--risco)] py-3 sm:grid-cols-4">
        <div>
          <dt className="font-mono text-[0.62rem] uppercase tracking-wider opacity-60">
            {t.role}
          </dt>
          <dd className="text-sm">{projeto.role}</dd>
        </div>
        <div>
          <dt className="font-mono text-[0.62rem] uppercase tracking-wider opacity-60">
            {t.year}
          </dt>
          <dd className="text-sm">{projeto.year}</dd>
        </div>
        <div className="col-span-2">
          <dt className="font-mono text-[0.62rem] uppercase tracking-wider opacity-60">
            {t.stackLabel}
          </dt>
          <dd className="text-sm">{projeto.stack.join(" · ")}</dd>
        </div>
      </dl>

      {projeto.images.length > 0 ? (
        <div className="mt-5">
          <ProjectCarousel
            images={projeto.images}
            title={projeto.title}
            dict={dict}
          />
        </div>
      ) : null}

      <div
        className="prose mt-5 text-[0.95rem]"
        dangerouslySetInnerHTML={{ __html: projeto.bodyHtml }}
      />

      <div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--risco)] pt-4">
        {projeto.live ? (
          <a
            href={projeto.live}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={format(t.liveDemoOf, { title: projeto.title })}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#0a5648] px-3 py-2 text-xs font-medium text-white transition hover:opacity-90"
          >
            {t.liveDemo}
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </a>
        ) : null}
        {projeto.repo ? (
          <a
            href={projeto.repo}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={format(t.sourceCodeOf, { title: projeto.title })}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--risco)] px-3 py-2 text-xs transition hover:bg-black/5"
          >
            <Github aria-hidden="true" className="size-4" />
            {t.sourceCode}
          </a>
        ) : null}
        {/* A página própria continua existindo, e é o endereço que se
            compartilha. Daqui ela abre em aba nova para não derrubar a ilha. */}
        <Link
          href={`/${locale}/projects/${projeto.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--risco)] px-3 py-2 text-xs transition hover:bg-black/5"
        >
          {t.viewCase}
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}

/* ---------- Mods: tela da TV da sala ---------- */

export function PainelMods({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const t = dict.hobby;
  return (
    <div className="space-y-5">
      <div>
        <SobretituloTela>{t.eyebrow}</SobretituloTela>
        <TituloTela>{t.title}</TituloTela>
        <p className="mt-2 text-sm text-[var(--tinta-fraca)]">{t.lead}</p>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-[var(--risco)] bg-[color-mix(in_srgb,var(--tinta)_6%,transparent)] p-4 sm:flex-row">
        <Image
          src={mod.preview}
          alt={t.modPreviewAlt}
          width={128}
          height={128}
          className="size-28 shrink-0 self-start rounded-md object-cover ring-1 ring-white/10"
        />
        <div className="min-w-0 space-y-3">
          <h3 className="font-display text-lg text-[var(--tinta)]">{mod.nome}</h3>
          <p className="text-xs leading-relaxed text-[var(--tinta-fraca)]">
            {t.modResumo}
          </p>
          <ul className="flex flex-wrap gap-1">
            {mod.tags.map((tag) => (
              <li key={tag}>
                <Tag>{tag}</Tag>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href={`/${locale}/mods/${mod.manualSlug}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-ink transition hover:opacity-90"
            >
              {t.verManual}
            </Link>
            <a
              href={mod.workshopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--risco)] px-3 py-1.5 text-xs text-[var(--tinta)] transition hover:bg-[color-mix(in_srgb,var(--tinta)_8%,transparent)]"
            >
              {t.verNaWorkshop}
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </a>
          </div>
        </div>
      </div>

      <p className="font-mono text-xs text-[var(--tinta-tenue)]">
        {mod.linhasDeLua} {t.linhasLua} · {mod.buildDoJogo}
      </p>
    </div>
  );
}

/* ---------- Contato: tela do monitor da direita ---------- */

export function PainelContato({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const t = dict.contact;
  return (
    <div className="space-y-4">
      <div>
        <SobretituloTela>{t.eyebrow}</SobretituloTela>
        <TituloTela>{t.title}</TituloTela>
        <p className="mt-2 text-sm text-[var(--tinta-fraca)]">{t.lead}</p>
      </div>
      <ContactForm locale={locale} dict={dict} />
    </div>
  );
}

/* ---------- Currículo: folha no cavalete ---------- */

export function PainelCurriculo({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const arquivo =
    locale === "pt" ? "/curriculo-victor-motta.pdf" : "/resume-victor-motta.pdf";

  return (
    /* O mesmo arranjo da folha no 3D, agora em paisagem: foto e nome em cima,
       um filete, os dois parágrafos lado a lado e os botões embaixo. É o que
       faz o painel parecer a folha que estava ali antes de a câmera chegar
       perto — e o quadro é largo e baixo, então uma coluna de 34rem no meio
       dele deixava metade da lousa em branco.

       `min-h-full` e não `h-full`: em tela estreita o painel vira folha alta e
       o conteúdo pode passar da altura: aí ele cresce e o pai rola, em vez de
       ser aparado. Os parágrafos levam o `flex-1` porque é neles que a sobra
       de altura deve ficar — assim os botões encostam no rodapé em vez de
       ficarem pendurados logo abaixo do texto. */
    <div className="flex min-h-full flex-col gap-5">
      <div className="flex items-start gap-4">
        <Image
          src="/victor.png"
          alt={dict.about.photoAlt}
          width={96}
          height={112}
          /* Ancorada no topo pelo mesmo motivo do painel Sobre: recorte
             centralizado numa foto tão alta come o rosto. */
          className="h-28 w-24 shrink-0 object-cover object-top"
        />
        <div className="min-w-0 pt-1">
          <h2 className="font-display text-2xl leading-tight text-[var(--tinta)]">
            {site.name}
          </h2>
          <p className="mt-1 inline-block bg-[#1d4ed8] px-2 py-0.5 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-white">
            {dict.hero.eyebrow}
          </p>
        </div>
      </div>

      <hr className="border-[var(--risco)]" />

      {/* Uma coluna por parágrafo, os três — os mesmos da folha em 3D. Eram os
          dois primeiros, corte herdado de quando a folha era retrato. */}
      <div className="grid flex-1 content-start gap-5 text-sm leading-relaxed text-[var(--tinta-fraca)] sm:grid-cols-3">
        {dict.about.paragraphs.slice(0, 3).map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-[var(--risco)] pt-4">
        <a
          href={arquivo}
          download
          className="inline-flex items-center gap-1.5 rounded-md bg-[#0a5648] px-3 py-2 text-xs font-medium text-white transition hover:opacity-90"
        >
          <Download aria-hidden="true" className="size-4" />
          {dict.nav.resume}
        </a>
        <a
          href={site.github}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--risco)] px-3 py-2 text-xs text-[var(--tinta)] transition hover:bg-[color-mix(in_srgb,var(--tinta)_8%,transparent)]"
        >
          <Github aria-hidden="true" className="size-4" />
          GitHub
        </a>
      </div>
    </div>
  );
}
