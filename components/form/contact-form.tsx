"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { FileDropzone } from "@/components/form/file-dropzone";
import { FormField, fieldClasses } from "@/components/form/form-field";
import type { Dictionary } from "@/content/i18n";
import type { Locale } from "@/content/site";
import {
  PROJECT_TYPES,
  buildContactSchema,
  type ContactFormValues,
} from "@/lib/validation";

type Status = "idle" | "submitting" | "success" | "error";
type ErrorCode =
  | "validation"
  | "rate_limit"
  | "server"
  | "network"
  | "config"
  | "too_large";

export function ContactForm({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const t = dict.contact.form;
  const schema = useMemo(
    () => buildContactSchema(dict.contact.validation),
    [dict],
  );

  const [status, setStatus] = useState<Status>("idle");
  const [errorCode, setErrorCode] = useState<ErrorCode>("server");

  /* Foco vai para o painel de resultado quando o envio termina — sem isso a
     pessoa que usa leitor de tela nao sabe que algo mudou na tela. */
  const feedbackRef = useRef<HTMLDivElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    setFocus,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      projectType: "web",
      message: "",
      files: [],
      website: "",
      renderedAt: 0,
    },
  });

  /* useWatch e nao watch(): watch() devolve uma funcao nova a cada render, que
     o compilador do React nao consegue memoizar e por isso desiste de otimizar
     o componente inteiro. useWatch assina o campo direto. */
  const files = useWatch({ control, name: "files" });

  /* Carimba o momento em que o formulario ficou pronto. O servidor compara
     com a hora do envio: humano nao preenche isso em menos de 3 segundos. */
  useEffect(() => {
    setValue("renderedAt", Date.now());
    register("files");
    register("renderedAt");
  }, [register, setValue]);

  useEffect(() => {
    if (status === "success" || status === "error") {
      feedbackRef.current?.focus();
    }
  }, [status]);

  /* O input de arquivo nao e registrado pelo RHF, entao o foco automatico de
     erro nao o alcanca. Levamos manualmente. */
  useEffect(() => {
    if (errors.files) {
      dropzoneRef.current?.scrollIntoView({ block: "center" });
    }
  }, [errors.files]);

  /* Funcao solta, e nao `handleSubmit(...)` chamado aqui: chamar handleSubmit
     durante o render faz o compilador do React tratar este callback como
     codigo de render e reprovar `Date.now()` e `fetch` como impuros. A
     composicao acontece no onSubmit do <form>, ja dentro do evento. */
  const submitContact = async (values: ContactFormValues) => {
    setStatus("submitting");

    const payload = new FormData();
    payload.set("name", values.name);
    payload.set("email", values.email);
    payload.set("company", values.company ?? "");
    payload.set("projectType", values.projectType);
    payload.set("message", values.message);
    payload.set("website", values.website ?? "");
    payload.set("renderedAt", String(values.renderedAt));
    payload.set("locale", locale);
    values.files.forEach((file) => payload.append("files", file));

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        body: payload,
      });

      if (response.ok) {
        setStatus("success");
        reset();
        setValue("renderedAt", Date.now());
        return;
      }

      /* 413 vem da infraestrutura da Vercel, nao da nossa rota: o corpo nem
         chega a ser JSON. Precisa ser tratado pelo status. */
      if (response.status === 413) {
        setErrorCode("too_large");
        setStatus("error");
        return;
      }

      const body = (await response.json().catch(() => null)) as {
        error?: ErrorCode;
      } | null;
      setErrorCode(body?.error ?? "server");
      setStatus("error");
    } catch {
      setErrorCode("network");
      setStatus("error");
    }
  };

  const errorMessage =
    errorCode === "rate_limit"
      ? t.errorRateLimit
      : errorCode === "network"
        ? t.errorNetwork
        : errorCode === "config"
          ? t.errorConfig
          : errorCode === "too_large"
            ? t.errorTooLarge
            : t.errorGeneric;

  if (status === "success") {
    return (
      <div
        ref={feedbackRef}
        tabIndex={-1}
        role="status"
        className="rounded-[var(--radius-card)] border border-[var(--color-accent)]/40 bg-[var(--color-surface)] p-8 text-center"
      >
        <CheckCircle2
          aria-hidden="true"
          className="mx-auto size-10 text-[var(--color-accent)]"
        />
        <h3 className="mt-4 text-xl text-[var(--color-fg)]">{t.successTitle}</h3>
        <p className="mt-2 text-[var(--color-fg-muted)]">{t.success}</p>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setTimeout(() => setFocus("name"), 0);
          }}
          className="mt-6 inline-flex h-12 items-center rounded-[var(--radius-control)] border border-[var(--color-border-strong)] px-6 font-medium text-[var(--color-fg)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          {t.sendAnother}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(submitContact)(event);
      }}
      noValidate
      className="space-y-6"
    >
      {/* Honeypot: fora do fluxo visual, fora da ordem de tabulacao e
          invisivel para leitor de tela. So bot preenche. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-0">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField id="name" label={t.name} error={errors.name?.message}>
          {(props) => (
            <input
              {...props}
              {...register("name")}
              type="text"
              autoComplete="name"
              placeholder={t.namePlaceholder}
              className={fieldClasses}
            />
          )}
        </FormField>

        <FormField
          id="email"
          label={t.email}
          hint={t.emailHint}
          error={errors.email?.message}
        >
          {(props) => (
            <input
              {...props}
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder={t.emailPlaceholder}
              className={fieldClasses}
            />
          )}
        </FormField>

        <FormField
          id="company"
          label={t.company}
          optionalLabel={t.companyOptional}
          error={errors.company?.message}
        >
          {(props) => (
            <input
              {...props}
              {...register("company")}
              type="text"
              autoComplete="organization"
              placeholder={t.companyPlaceholder}
              className={fieldClasses}
            />
          )}
        </FormField>

        <FormField
          id="projectType"
          label={t.projectType}
          error={errors.projectType?.message}
        >
          {(props) => (
            <select
              {...props}
              {...register("projectType")}
              className={fieldClasses}
            >
              {PROJECT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t.projectTypes[type]}
                </option>
              ))}
            </select>
          )}
        </FormField>
      </div>

      <FormField
        id="message"
        label={t.message}
        hint={t.messageHint}
        error={errors.message?.message}
      >
        {(props) => (
          <textarea
            {...props}
            {...register("message")}
            rows={6}
            placeholder={t.messagePlaceholder}
            className={`${fieldClasses} resize-y`}
          />
        )}
      </FormField>

      <div ref={dropzoneRef}>
        <FormField
          id="files"
          label={t.files}
          hint={t.filesHint}
          optionalLabel={t.filesOptional}
          error={errors.files?.message}
        >
          {(props) => (
            <FileDropzone
              files={files ?? []}
              onChange={(next) =>
                setValue("files", next, { shouldValidate: true })
              }
              dict={t}
              describedBy={props["aria-describedby"]}
              invalid={props["aria-invalid"]}
            />
          )}
        </FormField>
      </div>

      {status === "error" ? (
        <div
          ref={feedbackRef}
          tabIndex={-1}
          role="alert"
          className="flex gap-3 rounded-[var(--radius-control)] border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/8 p-4"
        >
          <AlertCircle
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-[var(--color-danger)]"
          />
          <div>
            <p className="font-medium text-[var(--color-fg)]">{t.errorTitle}</p>
            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
              {errorMessage}
            </p>
          </div>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={status === "submitting"}
        aria-busy={status === "submitting"}
        className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-accent)] px-7 font-semibold text-[var(--color-accent-ink)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {status === "submitting" ? (
          <>
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            {t.submitting}
          </>
        ) : (
          <>
            <Send aria-hidden="true" className="size-4" />
            {t.submit}
          </>
        )}
      </button>
    </form>
  );
}
