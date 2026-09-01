/**
 * Stack exibida na seção 02. Os grupos batem com as chaves de
 * `stack.groups` no dicionário i18n.
 *
 * `level` alimenta a barra de proficiência: "core" = uso diário, "strong" =
 * confortável, "working" = resolvo o que precisa.
 *
 * PHP, Bootstrap e MySQL entraram como "core" porque são o que a Tiix usa
 * todo dia — o texto do Sobre diz isso, e a stack precisa dizer o mesmo. Um
 * portfólio que descreve o emprego atual numa seção e não lista as
 * ferramentas dele na outra parece desatualizado justamente onde deveria
 * estar mais em dia.
 */
export type SkillLevel = "core" | "strong" | "working";

export type Skill = {
  name: string;
  level: SkillLevel;
  /** Cor do lutador no palco. Puxada da identidade de cada tecnologia. */
  cor: string;
  /** Silhueta do boneco de voxel. Muda o corpo, não só a cor. */
  porte: "agil" | "pesado" | "tecnico";
};

export type StackGroup = "frontend" | "backend" | "data" | "tools";

export const stack: Record<StackGroup, Skill[]> = {
  frontend: [
    { name: "TypeScript", level: "core", cor: "#3178c6", porte: "tecnico" },
    { name: "React", level: "core", cor: "#61dafb", porte: "agil" },
    { name: "Next.js", level: "core", cor: "#c9c9d1", porte: "tecnico" },
    { name: "Tailwind CSS", level: "core", cor: "#38bdf8", porte: "agil" },
    { name: "HTML & CSS", level: "core", cor: "#e34f26", porte: "agil" },
    { name: "Bootstrap", level: "core", cor: "#7952b3", porte: "agil" },
    { name: "React Native", level: "working", cor: "#61dafb", porte: "agil" },
  ],
  backend: [
    { name: "Node.js", level: "core", cor: "#5fa04e", porte: "pesado" },
    { name: "PHP", level: "core", cor: "#777bb4", porte: "pesado" },
    { name: "REST APIs", level: "core", cor: "#4ee1c1", porte: "tecnico" },
    { name: "Python", level: "strong", cor: "#ffd43b", porte: "tecnico" },
    { name: "Autenticação & RBAC", level: "strong", cor: "#f0883e", porte: "pesado" },
    { name: "WebSockets", level: "working", cor: "#a78bfa", porte: "agil" },
  ],
  data: [
    { name: "PostgreSQL", level: "core", cor: "#4169e1", porte: "pesado" },
    { name: "MySQL", level: "core", cor: "#00758f", porte: "pesado" },
    { name: "SQL", level: "core", cor: "#7fd4d4", porte: "tecnico" },
    { name: "Supabase", level: "strong", cor: "#3ecf8e", porte: "pesado" },
    { name: "Docker", level: "strong", cor: "#2496ed", porte: "pesado" },
    { name: "Vercel", level: "strong", cor: "#ededf0", porte: "tecnico" },
  ],
  tools: [
    { name: "Git", level: "core", cor: "#f05032", porte: "tecnico" },
    { name: "Figma", level: "strong", cor: "#f24e1e", porte: "agil" },
    { name: "Vitest", level: "strong", cor: "#a3e635", porte: "agil" },
    { name: "CI/CD", level: "strong", cor: "#4ee1c1", porte: "pesado" },
    { name: "Linux", level: "strong", cor: "#fbbf24", porte: "pesado" },
  ],
};

export const stackGroupOrder: StackGroup[] = [
  "frontend",
  "backend",
  "data",
  "tools",
];

/** Todos os lutadores numa lista só, que é o que a grade de seleção consome. */
export const todosOsSkills: (Skill & { grupo: StackGroup })[] =
  stackGroupOrder.flatMap((grupo) =>
    stack[grupo].map((s) => ({ ...s, grupo })),
  );

/** Atributos exibidos como barras, no estilo de ficha de personagem. */
export const ATRIBUTOS: Record<SkillLevel, { dominio: number; uso: number }> = {
  core: { dominio: 95, uso: 100 },
  strong: { dominio: 75, uso: 65 },
  working: { dominio: 50, uso: 35 },
};
