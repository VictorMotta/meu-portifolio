import { z } from "zod";
import { format, type Dictionary } from "@/content/i18n";

/* Limites de anexo.
   Quem manda aqui NAO e a Resend (que aceita 40 MB pos-base64), e sim a
   Vercel: ela recusa qualquer requisicao acima de 4,5 MB com um 413 que
   acontece antes do nosso codigo rodar. 4 MB deixa folga para os campos de
   texto e o overhead do multipart.
   Na pratica quase ninguem encosta nesse teto, porque o navegador comprime as
   imagens antes de enviar (lib/compress-image.ts). */
export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 4 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export const PROJECT_TYPES = [
  "web",
  "mobile",
  "api",
  "consulting",
  "other",
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

/**
 * Formato dos dados do formulario.
 *
 * O schema abaixo entra e sai exatamente neste tipo — sem `.default()` nem
 * `.optional()`, que fariam input e output divergirem e quebrariam a tipagem
 * do zodResolver no react-hook-form. Campos "opcionais" chegam como string
 * vazia, que e o que um <input> vazio produz de qualquer forma.
 */
export type ContactFormValues = {
  name: string;
  email: string;
  company: string;
  projectType: ProjectType;
  message: string;
  files: File[];
  website: string;
  renderedAt: number;
};

/**
 * Um unico schema para os dois lados: o formulario usa via zodResolver e a
 * API Route roda de novo no servidor. Validacao de client e conveniencia de
 * UX; a do servidor e a que vale.
 *
 * Recebe o dicionario para que as mensagens de erro saiam no idioma da pagina.
 */
export function buildContactSchema(t: Dictionary["contact"]["validation"]) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(2, { message: t.nameMin })
      .max(80, { message: t.nameMax }),

    email: z
      .email({ message: t.emailInvalid })
      .max(160, { message: t.emailInvalid }),

    /* Vazio e valido — o campo e opcional na UI. */
    company: z.string().trim().max(80, { message: t.companyMax }),

    projectType: z.enum(PROJECT_TYPES, { message: t.projectTypeInvalid }),

    message: z
      .string()
      .trim()
      .min(20, { message: t.messageMin })
      .max(5000, { message: t.messageMax }),

    /* superRefine em vez de refine: e o unico jeito no zod 4 de a mensagem
       citar qual arquivo especifico falhou. */
    files: z.array(z.instanceof(File)).superRefine((files, ctx) => {
      if (files.length > MAX_FILES) {
        ctx.addIssue({ code: "custom", message: t.fileTooMany });
        return;
      }

      const oversized = files.find((file) => file.size > MAX_FILE_BYTES);
      if (oversized) {
        ctx.addIssue({
          code: "custom",
          message: format(t.fileTooLarge, { name: oversized.name }),
        });
        return;
      }

      const wrongType = files.find(
        (file) =>
          !(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type),
      );
      if (wrongType) {
        ctx.addIssue({
          code: "custom",
          message: format(t.fileWrongType, { name: wrongType.name }),
        });
        return;
      }

      const total = files.reduce((sum, file) => sum + file.size, 0);
      if (total > MAX_TOTAL_BYTES) {
        ctx.addIssue({ code: "custom", message: t.fileTotalTooLarge });
      }
    }),

    /* Armadilha para bot: um campo que humano nunca ve nem tabula. Se vier
       preenchido, a requisicao e descartada silenciosamente. */
    website: z.string().max(0),

    /* Momento em que o formulario foi montado. Bot preenche e envia em
       milissegundos; pessoa leva alguns segundos. */
    renderedAt: z.number().int().nonnegative(),
  });
}

/** Tempo minimo entre carregar o formulario e enviar. Abaixo disso, e bot. */
export const MIN_FILL_MILLIS = 3000;

/** Formata bytes para a UI: 2.4 MB, 812 KB. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
