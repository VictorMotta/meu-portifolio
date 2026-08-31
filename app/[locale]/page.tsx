import { notFound } from "next/navigation";

import { ModoIlha } from "@/components/ilha/modo-ilha";
import { About } from "@/components/sections/about";
import { ContactSection } from "@/components/sections/contact-section";
import { Hero } from "@/components/sections/hero";
import { HobbySection } from "@/components/sections/hobby-section";
import { ProjectsSection } from "@/components/sections/projects-section";
import { StackSection } from "@/components/sections/stack-section";
import { WhatsAppFloatingButton } from "@/components/ui/whatsapp-button";
import { getDictionary } from "@/content/i18n";
import { locales, site, type Locale } from "@/content/site";
import { getProjects } from "@/lib/projects";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();

  const typedLocale = locale as Locale;
  const dict = getDictionary(typedLocale);
  const projetos = getProjects(typedLocale);

  /* JSON-LD do tipo Person: é o que faz o Google mostrar você como pessoa
     (nome, cargo, perfis) em vez de só uma página qualquer. */
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.name,
    url: `${site.url}/${locale}`,
    email: `mailto:${site.email}`,
    jobTitle: dict.hero.eyebrow,
    sameAs: [site.github, site.linkedin],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />

      {/* A página completa vai no HTML sempre: é o que o Google indexa, o que
          o leitor de tela lê e o que sobra se o WebGL falhar. A ilha entra por
          cima depois da hidratação e esconde este bloco. */}
      <div data-pagina-plana>
        <Hero locale={typedLocale} dict={dict} />
        <About dict={dict} locale={typedLocale} />
        <StackSection dict={dict} locale={typedLocale} />
        <ProjectsSection locale={typedLocale} dict={dict} />
        <HobbySection dict={dict} locale={typedLocale} />
        <ContactSection locale={typedLocale} dict={dict} />

        <WhatsAppFloatingButton
          message={dict.contact.whatsappPrefill}
          label={dict.contact.whatsappAria}
        />
      </div>

      <ModoIlha dict={dict} locale={typedLocale} projetos={projetos} />
    </>
  );
}
