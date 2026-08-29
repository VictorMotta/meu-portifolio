"use client";

import { Download, Menu, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { LocaleToggle } from "@/components/layout/locale-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import type { Dictionary } from "@/content/i18n";
import { site, type Locale } from "@/content/site";

type NavItem = { id: string; label: string };

/** Seletor de tudo que pode receber foco dentro do menu mobile. */
const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Header({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const home = `/${locale}`;
  const nav: NavItem[] = [
    { id: "sobre", label: dict.nav.about },
    { id: "stack", label: dict.nav.stack },
    { id: "projetos", label: dict.nav.projects },
    { id: "contato", label: dict.nav.contact },
  ];

  /* Fundo solido so depois de sair do topo — no hero o header flutua. */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Marca o item do menu correspondente a secao visivel. Vira aria-current,
     entao a informacao chega tambem a quem usa leitor de tela. */
  useEffect(() => {
    const sections = nav
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      /* A faixa cobre o meio da tela: a secao "ativa" e a que o usuario esta
         realmente lendo, nao a que encostou na borda. */
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    /* Devolve o foco ao botao que abriu — sem isso o foco volta para o
       inicio da pagina e a pessoa se perde. */
    triggerRef.current?.focus();
  }, []);

  /* Enquanto o menu esta aberto: Esc fecha, Tab circula dentro do painel e o
     corpo para de rolar por tras. */
  useEffect(() => {
    if (!menuOpen) return;

    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== "Tab" || !panel) return;

      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, closeMenu]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        scrolled
          ? "border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <div className="shell flex h-20 items-center justify-between gap-4">
        <Link
          href={home}
          /* inline-flex h-11 + padding lateral: o alvo de toque chega a 44px
             de altura sem o monograma mudar de tamanho. A margem negativa
             cancela o padding para o alinhamento continuar o mesmo. */
          className="-ml-2 inline-flex h-11 items-center px-2 font-[family-name:var(--font-display)] text-xl font-bold tracking-tight"
        >
          <span className="text-[var(--color-fg)]">{site.monogram}</span>
          <span className="text-[var(--color-accent)]">.</span>
          <span className="sr-only">{site.name} — {dict.nav.home}</span>
        </Link>

        <nav aria-label={dict.nav.home} className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <a
              key={item.id}
              href={`${home}#${item.id}`}
              aria-current={activeSection === item.id ? "true" : undefined}
              /* h-11 em vez de py-2: a partir de 768px este menu aparece no
                 iPad, onde e alvo de dedo e nao de mouse. */
              className={`inline-flex h-11 items-center rounded-full px-4 text-sm transition-colors ${
                activeSection === item.id
                  ? "text-[var(--color-accent)]"
                  : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle label={dict.nav.toggleTheme} />
          <LocaleToggle
            locale={locale}
            label={dict.nav.switchLanguage}
            shortLabel={dict.nav.languageShort}
          />

          <a
            href={site.resume[locale]}
            download
            className="hidden h-11 items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 text-sm font-semibold text-[var(--color-accent-ink)] transition-opacity hover:opacity-90 sm:inline-flex"
          >
            <Download aria-hidden="true" className="size-4" />
            {dict.nav.resume}
          </a>

          <button
            ref={triggerRef}
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={dict.nav.openMenu}
            aria-expanded={menuOpen}
            aria-controls="menu-mobile"
            className="grid size-11 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg)] md:hidden"
          >
            <Menu aria-hidden="true" className="size-5" />
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Clique fora fecha. E decorativo: quem usa teclado sai pelo Esc
              ou pelo botao de fechar, ambos dentro do painel. */}
          <div
            className="absolute inset-0 bg-[var(--color-bg)]/80 backdrop-blur-sm"
            onClick={closeMenu}
            aria-hidden="true"
          />

          <div
            ref={panelRef}
            id="menu-mobile"
            role="dialog"
            aria-modal="true"
            aria-label={dict.nav.openMenu}
            className="absolute inset-x-3 top-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2">
              <span className="font-[family-name:var(--font-display)] text-lg font-bold">
                {site.monogram}
                <span className="text-[var(--color-accent)]">.</span>
              </span>
              <button
                type="button"
                onClick={closeMenu}
                aria-label={dict.nav.closeMenu}
                className="grid size-11 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-fg)]"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            <nav aria-label={dict.nav.home}>
              <ul className="flex flex-col">
                {nav.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`${home}#${item.id}`}
                      onClick={closeMenu}
                      aria-current={activeSection === item.id ? "true" : undefined}
                      className="block border-b border-[var(--color-border)] py-4 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--color-fg)]"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <a
              href={site.resume[locale]}
              download
              onClick={closeMenu}
              className="mt-4 flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-accent)] text-sm font-semibold text-[var(--color-accent-ink)]"
            >
              <Download aria-hidden="true" className="size-4" />
              {dict.nav.resume}
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
