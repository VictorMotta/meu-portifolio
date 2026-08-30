"use client";

import { useEffect, useState } from "react";

import { WhatsApp as WhatsAppIcon } from "@/components/ui/brand-icons";
import { whatsappUrl } from "@/content/site";

/**
 * Botão flutuante de WhatsApp.
 *
 * Só aparece depois que a pessoa passa do hero — na primeira tela ele
 * competiria com os CTAs principais. `safe-bottom` evita que ele fique
 * embaixo da barra de gestos do iPhone.
 */
export function WhatsAppFloatingButton({
  message,
  label,
}: {
  message: string;
  label: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <a
      href={whatsappUrl(message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      /* Escondido do foco enquanto invisível: um link que não se ve não pode
         receber Tab, senao o foco some da tela. */
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={`safe-bottom fixed bottom-5 right-5 z-40 grid size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-xl transition-all duration-300 hover:scale-105 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <WhatsAppIcon aria-hidden="true" className="size-7" />
    </a>
  );
}

/** Versão em linha, usada dentro da seção de contato. */
export function WhatsAppLink({
  message,
  label,
  ariaLabel,
}: {
  message: string;
  label: string;
  ariaLabel: string;
}) {
  return (
    <a
      href={whatsappUrl(message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className="flex h-14 items-center justify-center gap-3 rounded-[var(--radius-control)] bg-[#25D366] px-6 font-semibold text-[#04120e] transition-opacity hover:opacity-90"
    >
      <WhatsAppIcon aria-hidden="true" className="size-5" />
      {label}
    </a>
  );
}
