import { site } from "@/content/site";

/**
 * A marca escrita: `VM` na cor do texto e `.DEV` no roxo do Dracula.
 *
 * O roxo tem token próprio (`--color-marca`) em vez de sair do acento, e o
 * motivo é o tema claro: o `#bd93f9` do Dracula dá 2,3:1 sobre o fundo claro,
 * reprovado para texto. O token é um PAR — o roxo original no escuro e o mesmo
 * roxo escurecido no claro, ambos AAA — como todo o resto da paleta.
 *
 * Não é o verde de acento porque marca não é ação: o acento é o que se pode
 * clicar (botões, links, o realce da seção atual), e a assinatura não é um
 * botão. O vermelho foi descartado por já ser `--color-danger`, a cor do erro
 * no formulário de contato.
 *
 * Existe como componente porque o mesmo desenho aparece em três lugares — o
 * cabeçalho da página, o menu de tela estreita e a barra da ilha — e as três
 * cópias já tinham divergido: duas mostravam `VM.` e a da ilha, `VM.DEV`.
 * Wordmark é a última coisa que pode variar entre telas do mesmo site.
 *
 * As iniciais saem de `site.monogram`, então trocá-las num lugar troca em
 * todos, inclusive no favicon.
 *
 * `aria-hidden` sempre: isto é desenho. Onde a marca é um link, quem dá o nome
 * acessível é o texto `sr-only` ao lado — sem isso o leitor de tela anunciaria
 * "VM ponto DEV" antes do nome de verdade. Onde ela é enfeite, não há nome
 * nenhum a dar.
 */
export function Marca({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`font-[family-name:var(--font-display)] font-bold tracking-tight ${className}`}
    >
      {site.monogram}
      <span className="text-[var(--color-marca)]">.DEV</span>
    </span>
  );
}
