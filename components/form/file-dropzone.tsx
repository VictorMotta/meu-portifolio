"use client";

import { ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { format, type Dictionary } from "@/content/i18n";
import { compressImage } from "@/lib/compress-image";
import { ACCEPTED_IMAGE_TYPES, MAX_FILES, formatBytes } from "@/lib/validation";

/**
 * Selecao de imagens com arrastar-e-soltar.
 *
 * O arrastar e um atalho, nao o caminho principal: por baixo existe um
 * <input type="file"> de verdade dentro de um <label>, entao clicar, tabular
 * e apertar Enter funcionam exatamente como em qualquer formulario.
 */
export function FileDropzone({
  files,
  onChange,
  dict,
  describedBy,
  invalid,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  dict: Dictionary["contact"]["form"];
  describedBy?: string;
  invalid?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const [otimizando, setOtimizando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Uma URL de objeto por arquivo, criada no proprio handler de evento — nem
     durante o render (seria impuro) nem dentro de um efeito (custaria um
     render extra a cada troca). O File mantem a mesma referencia enquanto
     estiver na lista, entao ele serve de chave.

     Revogar importa: uma URL de objeto viva segura o arquivo inteiro na
     memoria do navegador ate a aba fechar. */
  const [urls, setUrls] = useState<Map<File, string>>(() => new Map());

  /* Espelho das URLs para a limpeza de desmontagem: a funcao de cleanup de um
     efeito com dependencias vazias enxergaria o valor inicial do estado, e nao
     o atual. */
  const urlsRef = useRef(urls);
  useEffect(() => {
    urlsRef.current = urls;
  }, [urls]);

  useEffect(
    () => () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  const addFiles = async (incoming: FileList | null) => {
    if (!incoming) return;

    /* Corta no limite aqui tambem, alem do zod: e melhor a pessoa ver na hora
       que so cinco entraram do que descobrir no submit. */
    const escolhidos = Array.from(incoming).slice(
      0,
      Math.max(0, MAX_FILES - files.length),
    );
    if (escolhidos.length === 0) return;

    /* Redimensiona e recodifica antes de qualquer coisa: um print de celular
       chega com 6 MB e sai com uns 300 KB, o que mantem o envio abaixo do
       teto de 4,5 MB da Vercel sem a pessoa precisar saber que ele existe. */
    setOtimizando(true);
    const comprimidos = await Promise.all(escolhidos.map(compressImage));
    setOtimizando(false);

    const next = [...files, ...comprimidos];

    setUrls((previous) => {
      const merged = new Map(previous);
      for (const file of next) {
        if (!merged.has(file)) merged.set(file, URL.createObjectURL(file));
      }
      return merged;
    });

    onChange(next);
    /* Zera o input para que escolher o mesmo arquivo de novo dispare change. */
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    const removed = files[index];

    if (removed) {
      setUrls((previous) => {
        const url = previous.get(removed);
        if (!url) return previous;
        URL.revokeObjectURL(url);
        const next = new Map(previous);
        next.delete(removed);
        return next;
      });
    }

    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void addFiles(event.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-control)] border border-dashed px-6 py-8 text-center transition-colors ${
          dragging
            ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
            : invalid
              ? "border-[var(--color-danger)]"
              : "border-[var(--color-border-strong)] hover:border-[var(--color-accent)]"
        } focus-within:outline focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-[var(--color-accent)]`}
      >
        <input
          ref={inputRef}
          id="files"
          type="file"
          multiple
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          onChange={(event) => void addFiles(event.target.files)}
          aria-describedby={describedBy}
          /* sr-only em vez de hidden: o input continua no accessibility tree
             e recebe foco pelo Tab, so nao ocupa espaco visual. */
          className="sr-only"
        />
        <ImagePlus
          aria-hidden="true"
          className="size-6 text-[var(--color-fg-subtle)]"
        />
        <span className="text-sm text-[var(--color-fg-muted)]">
          {otimizando ? dict.filesOptimizing : dict.filesDrop}
        </span>
      </label>

      {files.length > 0 ? (
        <>
          {/* Anuncia a contagem sem roubar o foco de quem esta navegando. */}
          <p role="status" className="sr-only">
            {files.length === 1
              ? dict.filesSelectedOne
              : format(dict.filesSelectedMany, { count: files.length })}
          </p>

          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${file.lastModified}-${index}`}
                className="relative overflow-hidden rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface-2)]"
              >
                <div className="aspect-[4/3]">
                  {/* <img> puro e nao next/image: a origem e um blob: local,
                      que o otimizador de imagem do Next nao processa. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={urls.get(file)}
                    alt=""
                    className="size-full object-cover"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  aria-label={format(dict.filesRemove, { name: file.name })}
                  className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-[var(--color-bg)]/85 text-[var(--color-fg)] backdrop-blur transition-colors hover:text-[var(--color-danger)]"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>

                <p className="truncate px-2 py-1.5 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-fg-subtle)]">
                  {file.name} · {formatBytes(file.size)}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
