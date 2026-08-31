/**
 * Rate limit em memória, por IP, com janela deslizante.
 *
 * Suficiente para um portfólio: o custo de uma mensagem duplicada é baixo e o
 * honeypot já derruba a maior parte do lixo. A limitação conhecida é que o
 * estado vive no processo, em serverless cada instancia tem o seu contador, e
 * um reinicio zera tudo. Se um dia isso virar problema real, troque o corpo
 * de `hit()` por Upstash Redis; as assinaturas não precisam mudar.
 */

type Entry = { count: number; expiresAt: number };

/* Teto de chaves guardadas. Sem isso, alguém variando o IP faria o Map
   crescer sem limite até derrubar o processo por memória. */
const MAX_TRACKED_KEYS = 5000;

const entries = new Map<string, Entry>();

function evictExpired(now: number): void {
  for (const [key, entry] of entries) {
    if (entry.expiresAt <= now) entries.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  /** Segundos até a janela liberar de novo. Vira o header Retry-After. */
  retryAfterSeconds: number;
};

function hit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  if (entries.size > MAX_TRACKED_KEYS) evictExpired(now);

  const existing = entries.get(key);

  if (!existing || existing.expiresAt <= now) {
    entries.set(key, { count: 1, expiresAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((existing.expiresAt - now) / 1000),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Guarda barata, cobrada em TODA requisição antes de ler o corpo. Protege o
 * servidor de uma enxurrada de uploads de 15 MB. O teto é folgado de
 * propósito: erro de validação não pode bloquear quem só digitou errado.
 */
export function checkBurst(ip: string): RateLimitResult {
  return hit(`burst:${ip}`, 12, 10 * 60 * 1000);
}

/**
 * Cota de envio de verdade, cobrada só quando a mensagem passou por toda a
 * validação e vai virar e-mail. Três por janela é o suficiente para quem tem
 * algo a dizer, é pouco para quem quer encher a caixa de entrada.
 */
export function checkSendQuota(ip: string): RateLimitResult {
  return hit(`send:${ip}`, 3, 10 * 60 * 1000);
}

/**
 * Descobre o IP de origem atrás do proxy da Vercel.
 * `x-forwarded-for` pode vir como uma lista; o primeiro item é o cliente real.
 */
export function getClientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
