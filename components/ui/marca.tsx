import { site } from "@/content/site";

/**
 * A marca escrita: `VM` na cor do texto e `.dev` no acento.
 *
 * O `.dev` é minúsculo, e não versal como as iniciais: `VM` é sigla e `dev` é
 * domínio. Em versal os dois pesam igual e a assinatura vira um bloco só.
 *
 * A cor é a mesma dos botões de ação — `--color-accent`, o verde do
 * "Currículo" e do "Ver o caso". Já foi o roxo do Dracula num token próprio
 * (`--color-marca`), com o argumento de que marca não é ação e não devia usar
 * a cor do que se pode clicar. O Victor escolheu o acento, e o acento aguenta:
 * 10,5:1 no tema escuro e 5,4:1 no claro, os dois aprovados para texto. O roxo
 * é que precisava de um par próprio, porque o `#bd93f9` dava 2,3:1 no fundo
 * claro.
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
 * "VM ponto dev" antes do nome de verdade. Onde ela é enfeite, não há nome
 * nenhum a dar.
 */
export function Marca({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`font-[family-name:var(--font-display)] font-bold tracking-tight ${className}`}
    >
      {site.monogram}
      <span className="text-[var(--color-accent)]">.dev</span>
    </span>
  );
}
