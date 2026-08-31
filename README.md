# Portfólio. Victor Motta

Portfólio pessoal full stack: projetos com galeria, currículo, formulário de
contato que entrega **mensagem + imagens anexadas** por e-mail, e atalho direto
para o WhatsApp. Português e inglês, tema claro e escuro, acessibilidade
verificada por auditoria automatizada.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Motion ·
react-hook-form + Zod · Resend

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha os valores (veja abaixo)
npm run dev
```

Abre em <http://localhost:3000>. A raiz redireciona para `/pt` ou `/en`
conforme o idioma do navegador.

## Variáveis de ambiente

| Variável | Para que serve |
|---|---|
| `RESEND_API_KEY` | Chave da [Resend](https://resend.com/api-keys). Sem ela o formulário responde 500. |
| `CONTACT_TO_EMAIL` | Para onde as mensagens chegam. |
| `CONTACT_FROM_EMAIL` | Remetente. Veja a observação abaixo. |
| `NEXT_PUBLIC_SITE_URL` | URL pública. Alimenta canonical, sitemap, robots e Open Graph. |

> **Sem domínio próprio ainda?** Use `CONTACT_FROM_EMAIL="Portfólio <onboarding@resend.dev>"`.
> Nesse modo a Resend só entrega para o e-mail dono da conta, que é
> exatamente o destino do formulário, então funciona desde o primeiro dia.
> Quando tiver domínio verificado, troque o remetente e nada mais muda.
>
> Plano gratuito: 100 e-mails/dia, 3.000/mês, 3 domínios.

## O que você precisa preencher

Tudo que é seu está concentrado em quatro arquivos, nenhuma dessas
informações está espalhada pelo código:

| Arquivo | Conteúdo |
|---|---|
| [content/site.ts](content/site.ts) | Nome, e-mail, WhatsApp, GitHub, LinkedIn, caminhos dos currículos. |
| [content/stack.ts](content/stack.ts) | Tecnologias mostradas na seção 02. |
| [content/i18n.ts](content/i18n.ts) | Todos os textos do site, nos dois idiomas. |
| [public/projetos/](public/projetos/) | Um `.md` por projeto, com as imagens ao lado. |

Os PDFs e a foto vão em `public/`, veja [public/LEIA-ME.txt](public/LEIA-ME.txt).
Enquanto não existirem, o site mostra placeholders desenhados em vez de imagens
quebradas.

Procure por `PLACEHOLDER` e `TODO(victor)` para achar o que ainda é fictício.

## Projetos: uma pasta, sem banco

Os projetos não vivem em código nem em banco de dados, são arquivos em
[public/projetos/](public/projetos/), lidos no build por
[lib/projects.ts](lib/projects.ts):

```
public/projetos/
  plataforma-corretora.md        <- o .md em PT é o que CRIA o projeto
  plataforma-corretora.en.md     <- tradução opcional (sem ela, /en cai no PT)
  plataforma-corretora_1.webp    <- carrossel, em ordem; a _1 é a capa do card
  plataforma-corretora_2.webp
```

O nome-base amarra o texto às imagens e vira a URL. Para publicar um projeto
novo, basta adicionar os arquivos, não há índice para atualizar.

Dentro do `.md`, o primeiro `# título` vira o nome do projeto e o primeiro
parágrafo vira o resumo do card, então o cabeçalho YAML carrega só o que não dá
para inferir (`year`, `featured`, `role`, `stack`, `repo`, `live`, `alts`). O
formato completo está em [public/projetos/LEIA-ME.txt](public/projetos/LEIA-ME.txt).

**O site é estático**: um `.md` novo só vai ao ar depois de commit e deploy.
largar o arquivo no servidor não pública sozinho. Em compensação, as páginas
saem como HTML pré-renderizado e o git funciona como CMS, com histórico e
rollback de graça.

A numeração das imagens é ordenada por número, não por texto: `_10` vem depois
de `_9`, não entre `_1` e `_2`.

## Acessibilidade

Não é polimento final, é critério de aceite. O que está garantido:

- Skip link, HTML semântico, um único `<h1>` e hierarquia de headings sem pulos.
- **Todos** os pares de cor passam WCAG AA, conferidos contra `surface-2`, o
  pior caso, e anotados em [app/globals.css](app/globals.css).
- Foco visível em tudo, navegação completa por teclado, menu mobile com
  armadilha de foco, `Esc` fecha e devolve o foco ao gatilho.
- `prefers-reduced-motion` desliga as transformações e mantém só o fade.
- Formulário com `<label>` real, `aria-describedby`, `aria-invalid`, erros em
  `role="alert"` e foco levado ao primeiro campo inválido.

Verificação automatizada, com o site rodando em outro terminal:

```bash
npm run a11y              # axe-core: 2 idiomas x 2 temas x home e projeto
npm run a11y:interactive  # formulário com erro, menu mobile, foco, skip link
```

Os dois saem com código diferente de zero se algo falhar, dá para plugar em CI.
Se mexer em qualquer cor, rode `npm run a11y` antes de commitar.

## Formulário de contato

```
ContactForm ──FormData(POST)──▶ app/api/contact/route.ts ──▶ Resend
  RHF + Zod                      revalida com o MESMO schema     anexos como
  validação no cliente           honeypot · tempo · rate limit    Buffer + cid
```

- **O servidor nunca confia no cliente.** [lib/validation.ts](lib/validation.ts)
  exporta o schema usado nos dois lados; a rota revalida tipo, tamanho e
  quantidade antes de tocar na Resend.
- **Anexos:** até 5 imagens, 5 MB cada, 15 MB no total (o teto da Resend é
  40 MB *depois* do base64, que infla ~33%). Cada imagem vai anexada **e**
  embutida no corpo via `cid`.
- **Anti-spam:** honeypot invisível, tempo mínimo de preenchimento e rate limit
  por IP em dois níveis, uma guarda de rajada folgada antes de ler o upload, e
  uma cota de envio estrita cobrada só quando a mensagem já passou na validação
  (assim erro de digitação não gasta o limite de ninguém).
- **`replyTo`** aponta para o visitante: responder no Gmail já endereça certo.

## Deploy na Vercel

**Não existe back-end separado.** A API Route mora no mesmo projeto e vira uma
função serverless no mesmo deploy, um repositório, um `git push`, tudo no ar.

O que a Vercel monta a partir do build:

| O quê | Como é servido |
|---|---|
| `/pt`, `/en` e as páginas de projeto | HTML estático no CDN |
| `/api/contact` | Função serverless Node.js (precisa de `Buffer` para os anexos) |
| `proxy.ts` | Middleware na edge, redireciona a raiz para o idioma |
| `public/` (PDFs, imagens dos projetos) | Arquivos estáticos no CDN |

**Passos:** importe o repositório na Vercel → configure as quatro variáveis de
ambiente no painel (o `.env.local` não vai para o git) → deploy.
`NEXT_PUBLIC_SITE_URL` precisa ser a URL final, senão canonical, sitemap e
Open Graph apontam para `localhost`.

### Limites da plataforma que afetam este projeto

**Corpo da requisição: 4,5 MB.** É um teto rígido da Vercel, não configurável,
e o 413 acontece antes do nosso código rodar. Por isso o navegador comprime as
imagens antes de enviar ([lib/compress-image.ts](lib/compress-image.ts)): um
print de celular de 9 MB vira ~600 KB. A validação ainda corta em 4 MB no
total, então a requisição não tem como estourar o teto. O formulário também
trata o 413 explicitamente, caso ele apareça por outro caminho.

**Rate limit em memória.** [lib/rate-limit.ts](lib/rate-limit.ts) guarda o
estado no processo. Em serverless cada instância tem o seu contador e um
reinício zera tudo, ou seja, o limite é mais frouxo em produção do que
localmente. Para um portfólio está de bom tamanho (o honeypot derruba a maior
parte do lixo); se um dia virar problema, troque o corpo de `hit()` por Upstash
Redis sem mexer no resto.

**Projetos novos exigem deploy.** As páginas são estáticas: um `.md` novo em
`public/projetos/` só aparece depois de commit e push.

## Estrutura

```
app/[locale]/            páginas (home e /projects/[slug]), layout, 404
app/api/contact/         rota do formulário
components/layout/       header, nav mobile, footer, toggles, skip link
components/sections/     hero, sobre, stack, projetos, contato
components/form/         formulário, dropzone, campo acessível
components/ui/           reveal, cards, carrossel, ícones de marca, grão
content/                 SEUS DADOS: site, stack, traduções
emails/                  template HTML do e-mail
lib/                     leitor dos projetos, schema Zod compartilhado, rate limit
public/projetos/         SEUS PROJETOS: um .md e as imagens de cada um
scripts/                 auditorias de acessibilidade
proxy.ts                 redireciona a raiz para o idioma do navegador
```
