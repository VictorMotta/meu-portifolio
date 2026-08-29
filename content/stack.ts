/**
 * Stack exibida na secao 02. Os grupos batem com as chaves de
 * `stack.groups` no dicionario i18n.
 *
 * TODO(victor): ajuste para o que voce realmente usa. `level` alimenta a barra
 * de proficiencia: "core" = uso diario, "strong" = confortavel, "working" =
 * resolvo o que precisa.
 */
export type SkillLevel = "core" | "strong" | "working";

export type Skill = { name: string; level: SkillLevel };

export type StackGroup = "frontend" | "backend" | "data" | "tools";

export const stack: Record<StackGroup, Skill[]> = {
  frontend: [
    { name: "TypeScript", level: "core" },
    { name: "React", level: "core" },
    { name: "Next.js", level: "core" },
    { name: "Tailwind CSS", level: "core" },
    { name: "HTML & CSS", level: "core" },
    { name: "React Native", level: "working" },
  ],
  backend: [
    { name: "Node.js", level: "core" },
    { name: "REST APIs", level: "core" },
    { name: "Python", level: "strong" },
    { name: "Autenticacao & RBAC", level: "strong" },
    { name: "WebSockets", level: "working" },
  ],
  data: [
    { name: "PostgreSQL", level: "core" },
    { name: "SQL", level: "core" },
    { name: "Supabase", level: "strong" },
    { name: "Docker", level: "strong" },
    { name: "Vercel", level: "strong" },
  ],
  tools: [
    { name: "Git", level: "core" },
    { name: "Figma", level: "strong" },
    { name: "Vitest", level: "strong" },
    { name: "CI/CD", level: "strong" },
    { name: "Linux", level: "strong" },
  ],
};

export const stackGroupOrder: StackGroup[] = [
  "frontend",
  "backend",
  "data",
  "tools",
];
