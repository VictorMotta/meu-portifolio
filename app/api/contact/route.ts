import { NextResponse } from "next/server";
import { Resend } from "resend";

import { getDictionary } from "@/content/i18n";
import { defaultLocale, locales, type Locale } from "@/content/site";
import {
  renderContactEmail,
  renderContactText,
  type ContactEmailData,
} from "@/emails/contact-email";
import { checkBurst, checkSendQuota, getClientKey } from "@/lib/rate-limit";
import {
  MIN_FILL_MILLIS,
  buildContactSchema,
  formatBytes,
  type ProjectType,
} from "@/lib/validation";

/* Precisa de Node: o runtime edge nao tem Buffer, e a Resend espera os anexos
   como Buffer. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* O padrao da Vercel no plano gratuito e 10s. Enviar alguns MB de anexo pela
   Resend costuma levar menos de 2s, mas 30s evita corte em rede ruim. */
export const maxDuration = 30;

type ErrorCode = "validation" | "rate_limit" | "server" | "config";

function fail(code: ErrorCode, status: number, extra?: ResponseInit) {
  return NextResponse.json({ ok: false, error: code }, { status, ...extra });
}

function parseLocale(value: FormDataEntryValue | null): Locale {
  return locales.includes(value as Locale) ? (value as Locale) : defaultLocale;
}

export async function POST(request: Request) {
  /* 1. Guarda de rajada antes de qualquer trabalho — nao vale parsear 15 MB
     de upload de quem esta martelando o endpoint. O teto e folgado: quem so
     errou o formulario nao pode ficar de fora por isso. */
  const clientKey = getClientKey(request.headers);
  const burst = checkBurst(clientKey);
  if (!burst.allowed) {
    return fail("rate_limit", 429, {
      headers: { "Retry-After": String(burst.retryAfterSeconds) },
    });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("validation", 400);
  }

  const locale = parseLocale(form.get("locale"));
  const dict = getDictionary(locale);

  /* 2. Honeypot. Bot preenche todo campo que encontra; humano nunca ve este.
     Respondemos 200 de proposito: dizer "voce foi bloqueado" so ensina o bot
     a contornar. */
  const honeypot = form.get("website");
  if (typeof honeypot === "string" && honeypot.length > 0) {
    return NextResponse.json({ ok: true });
  }

  /* 3. Tempo de preenchimento. Mesma logica: descarta em silencio. */
  const renderedAt = Number(form.get("renderedAt"));
  if (
    Number.isFinite(renderedAt) &&
    renderedAt > 0 &&
    Date.now() - renderedAt < MIN_FILL_MILLIS
  ) {
    return NextResponse.json({ ok: true });
  }

  /* 4. Revalidacao no servidor com o MESMO schema do formulario. A validacao
     do client e so conforto de UX — esta e a que decide. */
  const files = form
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  const parsed = buildContactSchema(dict.contact.validation).safeParse({
    name: form.get("name"),
    email: form.get("email"),
    company: form.get("company") ?? "",
    projectType: form.get("projectType"),
    message: form.get("message"),
    files,
    website: "",
    renderedAt: Number.isFinite(renderedAt) ? renderedAt : 0,
  });

  if (!parsed.success) {
    return fail("validation", 400);
  }

  const data = parsed.data;

  /* 5. Cota de envio. Cobrada so aqui, com a mensagem ja validada: assim
     tentativa recusada por erro de digitacao nao gasta o limite de ninguem. */
  const quota = checkSendQuota(clientKey);
  if (!quota.allowed) {
    return fail("rate_limit", 429, {
      headers: { "Retry-After": String(quota.retryAfterSeconds) },
    });
  }

  /* 6. Config. Sem chave nao da para enviar — falhar alto no log do servidor e
     melhor do que fingir sucesso para o visitante. */
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    const faltando = [
      !apiKey && "RESEND_API_KEY",
      !to && "CONTACT_TO_EMAIL",
      !from && "CONTACT_FROM_EMAIL",
    ].filter(Boolean);

    console.error(
      `\n[contato] Envio nao configurado. Faltando em .env.local: ${faltando.join(", ")}` +
        "\n           Copie .env.example para .env.local, preencha e REINICIE o servidor" +
        "\n           (variavel de ambiente so e lida na inicializacao).\n",
    );

    /* Em producao o visitante recebe o erro generico: dizer "falta a chave da
       API" a quem esta do lado de fora entrega detalhe de infraestrutura sem
       ajudar ninguem. Em desenvolvimento, quem ve a tela e voce. */
    return fail(
      process.env.NODE_ENV === "development" ? "config" : "server",
      500,
    );
  }

  /* 7. Le cada imagem para Buffer e gera um cid, para que ela apareca tanto
     como anexo quanto embutida no corpo do e-mail. */
  const attachments = await Promise.all(
    data.files.map(async (file, index) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      return {
        filename: file.name,
        content: buffer,
        contentId: `image-${index}@portfolio`,
        contentType: file.type,
        size: file.size,
      };
    }),
  );

  const emailData: ContactEmailData = {
    name: data.name,
    email: data.email,
    company: data.company || undefined,
    projectType: data.projectType as ProjectType,
    message: data.message,
    images: attachments.map((a) => ({
      cid: a.contentId,
      filename: a.filename,
      size: formatBytes(a.size),
    })),
    submittedAt: new Date(),
  };

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: [to],
      /* Responder no cliente de e-mail ja endereca o visitante, sem
         copiar e colar o endereco na mao. */
      replyTo: data.email,
      subject: `Portfolio · ${data.name}${data.company ? ` (${data.company})` : ""}`,
      html: renderContactEmail(emailData),
      text: renderContactText(emailData),
      attachments: attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentId: a.contentId,
        contentType: a.contentType,
      })),
    });

    if (error) {
      console.error("[contact] Resend recusou o envio:", error);
      return fail("server", 502);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact] Falha inesperada no envio:", err);
    return fail("server", 500);
  }
}
