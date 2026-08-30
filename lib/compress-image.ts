/**
 * Reduz a imagem no navegador antes de enviar.
 *
 * Motivo concreto: a Vercel corta qualquer requisição acima de 4,5 MB com um
 * 413 que acontece ANTES do nosso código rodar — não da nem para responder
 * uma mensagem decente. Três prints de celular já passam disso.
 *
 * Comprimindo aqui, um print de 6 MB vira uns 300 KB e o problema deixa de
 * existir na prática, sem precisar recusar arquivo de ninguém.
 */

/** Maior lado da imagem depois de redimensionar. */
const LADO_MAXIMO = 1920;
const QUALIDADE = 0.82;

/** Abaixo disso não vale o trabalho de recodificar. */
const TAMANHO_MINIMO_PARA_COMPRIMIR = 300 * 1024;

export async function compressImage(file: File): Promise<File> {
  /* GIF fica de fora: o canvas só enxerga o primeiro quadro e destruiria a
     animação. */
  if (file.type === "image/gif") return file;

  if (
    file.size < TAMANHO_MINIMO_PARA_COMPRIMIR &&
    !file.type.startsWith("image/png")
  ) {
    return file;
  }

  try {
    /* imageOrientation "from-image" aplica o EXIF: sem isso, foto tirada em
       pe no celular chega deitada. */
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });

    const escala = Math.min(
      1,
      LADO_MAXIMO / Math.max(bitmap.width, bitmap.height),
    );
    const largura = Math.round(bitmap.width * escala);
    const altura = Math.round(bitmap.height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, largura, altura);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", QUALIDADE),
    );

    /* Se a conversão não ajudou (imagem já otimizada, por exemplo), fica o
       original — nunca entregar um arquivo maior do que o que entrou. */
    if (!blob || blob.size >= file.size) return file;

    const nome = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], nome, {
      type: "image/webp",
      lastModified: file.lastModified,
    });
  } catch {
    /* Navegador sem createImageBitmap ou arquivo corrompido: segue o original
       e deixa a validação de tamanho decidir. */
    return file;
  }
}
