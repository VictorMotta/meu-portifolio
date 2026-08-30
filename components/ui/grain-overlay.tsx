/**
 * Textura de grao por cima de tudo. E um SVG inline em vez de PNG: pesa
 * ~400 bytes, escala em qualquer densidade de tela e não gera requisição.
 *
 * aria-hidden + pointer-events-none: puramente decorativo, invisível para
 * leitor de tela e transparente ao clique.
 */
export function GrainOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 opacity-[0.035] mix-blend-overlay"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
  );
}
