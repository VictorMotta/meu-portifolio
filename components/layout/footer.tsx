import { ArrowUp, Mail } from "lucide-react";

import { Github, Linkedin } from "@/components/ui/brand-icons";

import { format, type Dictionary } from "@/content/i18n";
import { site, type Locale } from "@/content/site";

export function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const year = new Date().getFullYear();

  const links = [
    { href: site.github, label: dict.contact.githubLabel, Icon: Github },
    { href: site.linkedin, label: dict.contact.linkedinLabel, Icon: Linkedin },
    { href: `mailto:${site.email}`, label: dict.contact.emailLabel, Icon: Mail },
  ];

  return (
    <footer className="border-t border-[var(--color-border)] py-12">
      <div className="shell flex flex-col items-center gap-8 sm:flex-row sm:justify-between">
        <div className="text-center sm:text-left">
          <p className="text-sm text-[var(--color-fg)]">
            {format(dict.footer.rights, { year })}
          </p>
          <p className="mt-1 text-sm text-[var(--color-fg-subtle)]">
            {dict.footer.builtWith}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {links.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              /* Perfis externos abrem em nova aba; o mailto não, senao o
                 navegador deixa uma aba em branco para trás. */
              {...(href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              aria-label={label}
              className="grid size-11 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              <Icon aria-hidden="true" className="size-[18px]" />
            </a>
          ))}

          <a
            href={`/${locale}#topo`}
            aria-label={dict.footer.backToTop}
            className="grid size-11 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            <ArrowUp aria-hidden="true" className="size-[18px]" />
          </a>
        </div>
      </div>
    </footer>
  );
}
