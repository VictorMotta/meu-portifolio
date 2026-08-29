/**
 * Rate limit em memoria, por IP, com janela deslizante.
 *
 * Suficiente para um portfolio: o custo de uma mensagem duplicada e baixo e o
 * honeypot ja derruba a maior parte do lixo. A limitacao conhecida e que o
 * estado vive no processo — em serverless cada instancia tem o seu contador, e
 * um reinicio zera tudo. Se um dia isso virar problema real, troque o corpo
 * de `hit()` por Upstash Redis; as assinaturas nao precisam mudar.
 */

type Entry = { count: number; expiresAt: number };

/* Teto de chaves guardadas. Sem isso, alguem variando o IP faria o Map
   crescer sem limite ate derrubar o processo por memoria. */
const MAX_TRACKED_KEYS = 5000;

const entries = new Map<string, Entry>();

function evictExpired(now: number): void {
  for (const [key, entry] of entries) {
    if (entry.expiresAt <= now) entries.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  /** Segundos ate a janela liberar de novo. Vira o header Retry-After. */
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
 * Guarda barata, cobrada em TODA requisicao antes de ler o corpo. Protege o
 * servidor de uma enxurrada de uploads de 15 MB. O teto e folgado de
 * proposito: erro de validacao nao pode bloquear quem so digitou errado.
 */
export function checkBurst(ip: string): RateLimitResult {
  return hit(`burst:${ip}`, 12, 10 * 60 * 1000);
}

/**
 * Cota de envio de verdade, cobrada so quando a mensagem passou por toda a
 * validacao e vai virar e-mail. Tres por janela e o suficiente para quem tem
 * algo a dizer, e pouco para quem quer encher a caixa de entrada.
 */
export function checkSendQuota(ip: string): RateLimitResult {
  return hit(`send:${ip}`, 3, 10 * 60 * 1000);
}

/**
 * Descobre o IP de origem atras do proxy da Vercel.
 * `x-forwarded-for` pode vir como uma lista; o primeiro item e o cliente real.
 */
export function getClientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
