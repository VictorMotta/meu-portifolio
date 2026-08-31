import { Mail } from "lucide-react";

import { Github, Linkedin } from "@/components/ui/brand-icons";

import { ContactForm } from "@/components/form/contact-form";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { WhatsAppLink } from "@/components/ui/whatsapp-button";
import type { Dictionary } from "@/content/i18n";
import { site, type Locale } from "@/content/site";

export function ContactSection({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const direct = [
    {
      href: `mailto:${site.email}`,
      label: dict.contact.emailLabel,
      value: site.email,
      Icon: Mail,
      external: false,
    },
    {
      href: site.github,
      label: dict.contact.githubLabel,
      value: site.github.replace(/^https?:\/\//, ""),
      Icon: Github,
      external: true,
    },
    {
      href: site.linkedin,
      label: dict.contact.linkedinLabel,
      value: site.linkedin.replace(/^https?:\/\//, ""),
      Icon: Linkedin,
      external: true,
    },
  ];

  return (
    <section id="contato" className="scroll-mt-24 py-24 sm:py-32">
      <div className="shell">
        <SectionHeading
          eyebrow={dict.contact.eyebrow}
          title={dict.contact.title}
          lead={dict.contact.lead}
        />

        <div className="mt-14 grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <Reveal>
            <ContactForm locale={locale} dict={dict} />
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] painel p-6 sm:p-8">
              <h3 className="text-[length:var(--text-h3)] text-[var(--color-fg)]">
                {dict.contact.directTitle}
              </h3>

              <div className="mt-6">
                <WhatsAppLink
                  message={dict.contact.whatsappPrefill}
                  label={dict.contact.whatsapp}
                  ariaLabel={dict.contact.whatsappAria}
                />
              </div>

              <ul className="mt-6 space-y-1 border-t border-[var(--color-border)] pt-6">
                {direct.map(({ href, label, value, Icon, external }) => (
                  <li key={label}>
                    <a
                      href={href}
                      {...(external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className="flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-3 transition-colors hover:painel-fundo"
                    >
                      <Icon
                        aria-hidden="true"
                        className="size-[18px] shrink-0 text-[var(--color-accent)]"
                      />
                      <span className="min-w-0">
                        <span className="block text-xs text-[var(--color-fg-subtle)]">
                          {label}
                        </span>
                        <span className="block truncate text-sm text-[var(--color-fg)]">
                          {value}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
