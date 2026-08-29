/**
 * Fonte unica dos seus dados pessoais.
 *
 * TODO(victor): tudo marcado com PLACEHOLDER precisa ser trocado pelos seus
 * dados reais antes de publicar. Nao existe nenhuma dessas strings espalhada
 * pelo resto do codigo — trocar aqui atualiza o site inteiro.
 */

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
	url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

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
