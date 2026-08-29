import type { ProjectType } from "@/lib/validation";

/**
 * Template do e-mail de notificacao, escrito como HTML inline.
 *
 * Cliente de e-mail nao roda CSS moderno: nada de flexbox, grid ou variavel
 * CSS. Tabela e style inline sao o que funciona no Gmail, Outlook e Apple Mail
 * ao mesmo tempo — por isso o markup parece 2005 de proposito.
 */

const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  web: "Aplicacao web",
  mobile: "Aplicativo mobile",
  api: "API / back-end",
  consulting: "Consultoria / code review",
  other: "Outro",
};

/** Escapa entidades HTML — o conteudo vem de um formulario publico. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escapa e converte quebras de linha em <br>, preservando os paragrafos. */
function escapeMultiline(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br />");
}

export type ContactEmailData = {
  name: string;
  email: string;
  company?: string;
  projectType: ProjectType;
  message: string;
  /** Uma entrada por imagem anexada, ja com o cid usado no <img>. */
  images: { cid: string; filename: string; size: string }[];
  submittedAt: Date;
};

function row(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #26262b;color:#a1a1ab;font-size:13px;width:132px;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #26262b;color:#ededf0;font-size:15px;vertical-align:top;">${value}</td>
    </tr>`;
}

export function renderContactEmail(data: ContactEmailData): string {
  const when = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(data.submittedAt);

  const gallery =
    data.images.length === 0
      ? ""
      : `
      <tr>
        <td colspan="2" style="padding:24px 0 8px;">
          <p style="margin:0 0 12px;color:#4ee1c1;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;font-family:monospace;">
            ${data.images.length} ${data.images.length === 1 ? "imagem anexada" : "imagens anexadas"}
          </p>
          ${data.images
            .map(
              (img) => `
          <div style="margin-bottom:16px;">
            <img src="cid:${escapeHtml(img.cid)}" alt="${escapeHtml(img.filename)}"
                 style="display:block;width:100%;max-width:520px;height:auto;border-radius:12px;border:1px solid #26262b;" />
            <p style="margin:6px 0 0;color:#71717f;font-size:12px;font-family:monospace;">
              ${escapeHtml(img.filename)} · ${escapeHtml(img.size)}
            </p>
          </div>`,
            )
            .join("")}
        </td>
      </tr>`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Nova mensagem do portfolio</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0b;">
  <!-- Preview que aparece na lista do inbox antes de abrir -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${escapeHtml(data.name)} quer falar sobre ${escapeHtml(PROJECT_TYPE_LABELS[data.projectType])}.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#0a0a0b;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;background-color:#131316;border:1px solid #26262b;border-radius:20px;overflow:hidden;">

          <tr>
            <td style="padding:28px 32px 20px;border-bottom:1px solid #26262b;">
              <p style="margin:0 0 6px;color:#4ee1c1;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;font-family:monospace;">
                Portfolio · novo contato
              </p>
              <h1 style="margin:0;color:#ededf0;font-size:22px;font-weight:700;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                ${escapeHtml(data.name)}
              </h1>
              <p style="margin:6px 0 0;color:#71717f;font-size:13px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                ${escapeHtml(when)}
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 32px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${row("E-mail", `<a href="mailto:${escapeHtml(data.email)}" style="color:#4ee1c1;text-decoration:none;">${escapeHtml(data.email)}</a>`)}
                ${data.company ? row("Empresa", escapeHtml(data.company)) : ""}
                ${row("Tipo", escapeHtml(PROJECT_TYPE_LABELS[data.projectType]))}
                <tr>
                  <td colspan="2" style="padding:20px 0 0;">
                    <p style="margin:0 0 8px;color:#a1a1ab;font-size:13px;">Mensagem</p>
                    <div style="background-color:#1b1b1f;border:1px solid #26262b;border-radius:12px;padding:16px;color:#ededf0;font-size:15px;line-height:1.6;">
                      ${escapeMultiline(data.message)}
                    </div>
                  </td>
                </tr>
                ${gallery}
              </table>

              <a href="mailto:${escapeHtml(data.email)}"
                 style="display:inline-block;margin-top:24px;background-color:#4ee1c1;color:#04120e;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:12px;">
                Responder para ${escapeHtml(data.name)}
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #26262b;">
              <p style="margin:0;color:#71717f;font-size:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                Enviado pelo formulario de contato do seu portfolio.
                Basta responder este e-mail para falar direto com ${escapeHtml(data.name)}.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Versao texto puro, para clientes que nao renderizam HTML. */
export function renderContactText(data: ContactEmailData): string {
  const lines = [
    `Nova mensagem do portfolio`,
    ``,
    `Nome:    ${data.name}`,
    `E-mail:  ${data.email}`,
  ];
  if (data.company) lines.push(`Empresa: ${data.company}`);
  lines.push(
    `Tipo:    ${PROJECT_TYPE_LABELS[data.projectType]}`,
    ``,
    `Mensagem:`,
    data.message,
  );
  if (data.images.length > 0) {
    lines.push(
      ``,
      `Anexos (${data.images.length}):`,
      ...data.images.map((i) => `  - ${i.filename} (${i.size})`),
    );
  }
  return lines.join("\n");
}
