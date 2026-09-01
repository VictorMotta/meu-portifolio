import { KeyRound, Network, Table2 } from "lucide-react";
/* Importados um a um, e não como `import * as si`.
   O pacote inteiro tem mais de três mil ícones e uns 5 MB; com o namespace e
   a busca por string o empacotador não consegue descartar nada, e todos eles
   iam parar no primeiro carregamento do site. */
import {
  siBootstrap,
  siDocker,
  siFigma,
  siGit,
  siGithubactions,
  siHtml5,
  siLinux,
  siMysql,
  siNextdotjs,
  siNodedotjs,
  siPhp,
  siPostgresql,
  siPython,
  siReact,
  siSocketdotio,
  siSupabase,
  siTailwindcss,
  siTypescript,
  siVercel,
  siVitest,
} from "simple-icons";

/**
 * Logo de cada tecnologia.
 *
 * simple-icons (CC0) cobre 21 das 24. As três que sobram são conceitos, não
 * marcas: REST, autenticação e SQL não têm logo, então recebem um ícone
 * genérico do lucide em vez de eu inventar uma marca que não existe.
 *
 * Faltando aqui, a tecnologia não some da grade: ela aparece como a inicial
 * solta, no meio de vinte logos de verdade. Foi assim que PHP, Bootstrap e
 * MySQL entraram — como "P", "B" e "M".
 */

const MARCA: Record<string, { path: string }> = {
  TypeScript: siTypescript,
  React: siReact,
  "Next.js": siNextdotjs,
  "Tailwind CSS": siTailwindcss,
  "HTML & CSS": siHtml5,
  Bootstrap: siBootstrap,
  "React Native": siReact,
  "Node.js": siNodedotjs,
  PHP: siPhp,
  Python: siPython,
  WebSockets: siSocketdotio,
  PostgreSQL: siPostgresql,
  MySQL: siMysql,
  Supabase: siSupabase,
  Docker: siDocker,
  Vercel: siVercel,
  Git: siGit,
  Figma: siFigma,
  Vitest: siVitest,
  "CI/CD": siGithubactions,
  Linux: siLinux,
};
const GENERICO: Record<string, typeof Network> = {
  "REST APIs": Network,
  "Autenticação & RBAC": KeyRound,
  SQL: Table2,
};

export function LogoTech({
  nome,
  className,
}: {
  nome: string;
  className?: string;
}) {
  const icone = MARCA[nome];

  if (icone) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className={className}
      >
        <path d={icone.path} />
      </svg>
    );
  }

  const Generico = GENERICO[nome];
  if (Generico) return <Generico aria-hidden="true" className={className} />;

  /* Última reserva: a inicial. Nunca deve acontecer, mas é melhor que um
     buraco se alguém adicionar uma tecnologia nova. */
  return (
    <span aria-hidden="true" className={className}>
      {nome.charAt(0)}
    </span>
  );
}
