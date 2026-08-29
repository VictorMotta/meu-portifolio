/**
 * Fonte unica dos seus dados pessoais.
 *
 * TODO(victor): tudo marcado com PLACEHOLDER precisa ser trocado pelos seus
 * dados reais antes de publicar. Nao existe nenhuma dessas strings espalhada
 * pelo resto do codigo — trocar aqui atualiza o site inteiro.
 */

/**
 * Normaliza a URL publica do site.
 *
 * Existe porque `new URL()` exige o protocolo: colar so "victormotta.dev" no
 * painel da Vercel derrubava o build inteiro com um "Invalid URL" que nao
 * dizia qual variavel estava errada. Aqui o https:// entra sozinho, a barra
 * final sai, e um valor irrecuperavel vira aviso em vez de build quebrado.
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

	/** Somente digitos, com DDI e DDD. Ex.: 5511987654321 — PLACEHOLDER */
	whatsapp: "5521999866488",

	/** PLACEHOLDER — troque pelos seus perfis reais */
	github: "https://github.com/VictorMotta",
	linkedin: "https://www.linkedin.com/in/victor-mottas/",

	/** Usado em metadata, sitemap e robots. Em producao vem do env. */
	/* SITE_URL sem o prefixo NEXT_PUBLIC_ de proposito: este valor so e lido
	   no servidor (metadata, sitemap, robots) e nunca vai para o navegador.
	   Com o prefixo, a Vercel avisa — com razao — que uma variavel "publica"
	   nao pode ser marcada como Secret.

	   NEXT_PUBLIC_SITE_URL continua aceito para nao quebrar quem ja configurou.
	   VERCEL_PROJECT_PRODUCTION_URL e a ultima rede: se voce esquecer de
	   configurar, o site usa o dominio do proprio projeto em vez de apontar
	   canonical e sitemap para localhost. */
	url: normalizarUrl(
		process.env.SITE_URL ??
			process.env.NEXT_PUBLIC_SITE_URL ??
			process.env.VERCEL_PROJECT_PRODUCTION_URL,
	),

	/** PDFs em /public. Se voce so tiver um, aponte os dois para o mesmo arquivo. */
	resume: {
		pt: "/curriculo-victor-motta.pdf",
		en: "/resume-victor-motta.pdf",
	},

	/** Ano em que voce comecou a programar profissionalmente — vira "X anos" no Sobre. */
	careerStartYear: 2022,
} as const;

/** Monta o link do WhatsApp ja com a mensagem digitada para o visitante. */
export function whatsappUrl(message: string): string {
	return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}`;
}

/** Anos de carreira, calculado para nao envelhecer sozinho no texto. */
export function yearsOfExperience(): number {
	return new Date().getFullYear() - site.careerStartYear;
}
