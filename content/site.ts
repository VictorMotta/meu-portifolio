/**
 * Fonte única dos seus dados pessoais.
 *
 * TODO(victor): tudo marcado com PLACEHOLDER precisa ser trocado pelos seus
 * dados reais antes de publicar. Não existe nenhuma dessas strings espalhada
 * pelo resto do código — trocar aqui atualiza o site inteiro.
 */

/**
 * Normaliza a URL pública do site.
 *
 * Existe porque `new URL()` exige o protocolo: colar só "victormotta.dev" no
 * painel da Vercel derrubava o build inteiro com um "Invalid URL" que não
 * dizia qual variável estava errada. Aqui o https:// entra sozinho, a barra
 * final sai, e um valor irrecuperável vira aviso em vez de build quebrado.
 */
function normalizarUrl(bruta: string | undefined): string {
  const reserva = "http://localhost:3000";
  const limpa = bruta?.trim().replace(/\/+$/, "");
  if (!limpa) return reserva;

  const comProtocolo = /^https?:\/\//i.test(limpa) ? limpa : `https://${limpa}`;

  try {
    new URL(comProtocolo);
    return comProtocolo;
  } catch {
    console.warn(
      `[site] SITE_URL invalida: ${bruta}. Usando ${reserva}.` +
        " Canonical, sitemap e Open Graph vao apontar para o lugar errado.",
    );
    return reserva;
  }
}

export const locales = ["pt", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "pt";

export const site = {
	name: "Victor Motta",
	/** Iniciais usadas no monograma do header e no favicon. */
	monogram: "VM",
	email: "victormotta@victormotta.dev",

	/** Somente dígitos, com DDI e DDD. Ex.: 5511987654321 — PLACEHOLDER */
	whatsapp: "5521999866488",

	/** PLACEHOLDER — troque pelos seus perfis reais */
	github: "https://github.com/VictorMotta",
	linkedin: "https://www.linkedin.com/in/victor-mottas/",

	/** Usado em metadata, sitemap e robots. Em produção vem do env. */
	/* SITE_URL sem o prefixo NEXT_PUBLIC_ de propósito: este valor só é lido
	   no servidor (metadata, sitemap, robots) e nunca vai para o navegador.
	   Com o prefixo, a Vercel avisa — com razão — que uma variável "pública"
	   não pode ser marcada como Secret.

	   NEXT_PUBLIC_SITE_URL continua aceito para não quebrar quem já configurou.
	   VERCEL_PROJECT_PRODUCTION_URL e a última rede: se você esquecer de
	   configurar, o site usa o domínio do próprio projeto em vez de apontar
	   canonical e sitemap para localhost. */
	url: normalizarUrl(
		process.env.SITE_URL ??
			process.env.NEXT_PUBLIC_SITE_URL ??
			process.env.VERCEL_PROJECT_PRODUCTION_URL,
	),

	/** PDFs em /public. Se você só tiver um, aponte os dois para o mesmo arquivo. */
	resume: {
		pt: "/curriculo-victor-motta.pdf",
		en: "/resume-victor-motta.pdf",
	},

	/** Ano em que você comecou a programar profissionalmente — vira "X anos" no Sobre. */
	careerStartYear: 2022,
} as const;

/** Monta o link do WhatsApp já com a mensagem digitada para o visitante. */
export function whatsappUrl(message: string): string {
	return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}`;
}

/** Anos de carreira, calculado para não envelhecer sozinho no texto. */
export function yearsOfExperience(): number {
	return new Date().getFullYear() - site.careerStartYear;
}
