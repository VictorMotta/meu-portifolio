import { notFound } from "next/navigation";

import { About } from "@/components/sections/about";
import { ContactSection } from "@/components/sections/contact-section";
import { Hero } from "@/components/sections/hero";
import { ProjectsSection } from "@/components/sections/projects-section";
import { StackSection } from "@/components/sections/stack-section";
import { WhatsAppFloatingButton } from "@/components/ui/whatsapp-button";
import { getDictionary } from "@/content/i18n";
import { locales, site, type Locale } from "@/content/site";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();

  const typedLocale = locale as Locale;
  const dict = getDictionary(typedLocale);

  /* JSON-LD do tipo Person: e o que faz o Google mostrar voce como pessoa
     (nome, cargo, perfis) em vez de so uma pagina qualquer. */
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

      <Hero locale={typedLocale} dict={dict} />
      <About dict={dict} locale={typedLocale} />
      <StackSection dict={dict} locale={typedLocale} />
      <ProjectsSection locale={typedLocale} dict={dict} />
      <ContactSection locale={typedLocale} dict={dict} />

      <WhatsAppFloatingButton
        message={dict.contact.whatsappPrefill}
        label={dict.contact.whatsappAria}
      />
    </>
  );
}
