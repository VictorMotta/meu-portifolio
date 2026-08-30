import type { Locale } from "./site";

/**
 * Interpola `{chave}` num texto do dicionário.
 *
 * O dicionário é só string, sem função, de propósito: ele atravessa a
 * fronteira Server -> Client Component, e função não é serializável. Um
 * dicionário com função quebra o build na hora de prerenderizar.
 */
export function format(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

/**
 * Dicionário de textos. O objeto `pt` define o formato — `en` é tipado contra
 * ele, então esquecer de traduzir uma chave vira erro de compilacao, não um
 * buraco silencioso na página.
 */
const pt = {
  meta: {
    title: "Victor Motta — Desenvolvedor Full Stack",
    description:
      "Portfólio de Victor Motta, desenvolvedor full stack. Projetos, stack, currículo e contato direto.",
    localeTag: "pt-BR",
  },

  nav: {
    skipToContent: "Pular para o conteúdo",
    home: "Início",
    about: "Sobre",
    stack: "Stack",
    projects: "Projetos",
    contact: "Contato",
    resume: "Currículo",
    openMenu: "Abrir menu de navegação",
    closeMenu: "Fechar menu de navegação",
    toggleTheme: "Alternar entre tema claro e escuro",
    switchLanguage: "Ver este site em inglês",
    languageShort: "EN",
  },

  hero: {
    eyebrow: "Desenvolvedor Full Stack",
    availability: "Disponível para novos projetos",
    headline: ["Construo produtos", "que as pessoas", "conseguem usar."],
    lead:
      "Do banco de dados à interface. Escrevo software que aguenta produção, carrega rápido e funciona para todo mundo — inclusive para quem navega só pelo teclado.",
    ctaProjects: "Ver projetos",
    ctaResume: "Baixar currículo",
    scrollHint: "Role para explorar",
  },

  about: {
    eyebrow: "01 — Sobre",
    title: "Um dev que se importa com o que acontece depois do deploy",
    paragraphs: [
      "Sou desenvolvedor full stack e trabalho no ciclo inteiro: modelagem de dados, API, interface e o que quebra às três da manhã. Gosto de problema de verdade — o tipo que exige entender o negócio antes de abrir o editor.",
      "Acessibilidade e performance não entram no fim do projeto como enfeite. Entram na primeira decisão de arquitetura, porque depois sai caro.",
      "Quando não estou codando, estou provavelmente refatorando algo que já funcionava.",
    ],
    photoAlt: "Retrato de Victor Motta",
    stats: {
      experience: "anos de experiência",
      projects: "projetos entregues",
      focus: "foco atual",
      focusValue: "Full Stack & DX",
    },
  },

  stack: {
    eyebrow: "02 — Stack",
    title: "As ferramentas que uso todo dia",
    lead:
      "Não é uma lista de tudo que já toquei. É o que eu uso com confiança hoje, em produção.",
    groups: {
      frontend: "Front-end",
      backend: "Back-end",
      data: "Dados & Infra",
      tools: "Ferramentas",
    },
  },

  projects: {
    eyebrow: "03 — Projetos",
    title: "Trabalhos selecionados",
    lead:
      "Alguns projetos que representam bem como eu trabalho. Clique para ver o caso completo.",
    featured: "Destaque",
    viewCase: "Ver o caso",
    viewCaseOf: "Ver o caso completo do projeto {title}",
    liveDemo: "Ver ao vivo",
    liveDemoOf: "Abrir {title} em uma nova aba",
    sourceCode: "Código",
    sourceCodeOf: "Ver o código-fonte de {title} no GitHub",
    backToProjects: "Voltar para os projetos",
    role: "Meu papel",
    year: "Ano",
    stackLabel: "Stack",
    overview: "Sobre o projeto",
    empty: "Os projetos estão sendo preparados. Volte em breve.",
    carousel: "Imagens do projeto {title}",
    previousImage: "Imagem anterior",
    nextImage: "Próxima imagem",
    imageCounter: "Imagem {current} de {total}",
    goToImage: "Ir para a imagem {number}",
  },

  contact: {
    eyebrow: "04 — Contato",
    title: "Vamos conversar sobre o seu projeto",
    lead:
      "Descreva o que você precisa e anexe imagens, telas ou referências. Respondo em até um dia útil.",
    directTitle: "Prefere um caminho mais direto?",
    whatsapp: "Chamar no WhatsApp",
    whatsappAria: "Abrir uma conversa comigo no WhatsApp",
    whatsappPrefill:
      "Olá, Victor! Vi o seu portfólio e gostaria de conversar sobre um projeto.",
    emailLabel: "E-mail",
    githubLabel: "GitHub",
    linkedinLabel: "LinkedIn",

    form: {
      name: "Seu nome",
      namePlaceholder: "Como devo te chamar",
      email: "Seu e-mail",
      emailPlaceholder: "voce@empresa.com",
      emailHint: "Uso apenas para responder esta mensagem.",
      company: "Empresa",
      companyOptional: "opcional",
      companyPlaceholder: "Onde você trabalha",
      projectType: "Tipo de projeto",
      projectTypes: {
        web: "Aplicação web",
        mobile: "Aplicativo mobile",
        api: "API / back-end",
        consulting: "Consultoria / code review",
        other: "Outro",
      },
      message: "Mensagem",
      messagePlaceholder:
        "Conte o que você quer construir, o prazo que tem em mente e o que já existe hoje.",
      messageHint: "Mínimo de 20 caracteres.",
      files: "Imagens do projeto",
      filesOptional: "opcional",
      filesHint:
        "Até 5 imagens. São comprimidas automaticamente, então pode mandar o print direto do celular. Formatos: PNG, JPG, WebP ou GIF.",
      filesDrop: "Arraste imagens aqui ou clique para escolher",
      filesOptimizing: "Otimizando as imagens...",
      filesButton: "Escolher imagens",
      filesSelectedOne: "1 imagem selecionada",
      filesSelectedMany: "{count} imagens selecionadas",
      filesRemove: "Remover a imagem {name}",
      submit: "Enviar mensagem",
      submitting: "Enviando...",
      successTitle: "Mensagem enviada!",
      success:
        "Recebi tudo certinho e respondo em até um dia útil. Obrigado pelo contato.",
      sendAnother: "Enviar outra mensagem",
      errorTitle: "Não consegui enviar",
      errorGeneric:
        "Algo deu errado no envio. Tente de novo em instantes ou me chame no WhatsApp.",
      errorNetwork:
        "Não consegui falar com o servidor. Verifique sua conexão e tente de novo.",
      errorRateLimit:
        "Você já enviou algumas mensagens agora há pouco. Espere alguns minutos antes de tentar de novo.",
      errorTooLarge:
        "As imagens ficaram pesadas demais para o envio. Remova uma e tente de novo.",
      errorConfig:
        "O envio de e-mail ainda não está configurado. Preencha RESEND_API_KEY, CONTACT_TO_EMAIL e CONTACT_FROM_EMAIL no .env.local e reinicie o servidor. (Esta mensagem só aparece em desenvolvimento.)",
      requiredMark: "obrigatório",
    },

    validation: {
      nameMin: "Escreva seu nome com pelo menos 2 caracteres.",
      nameMax: "Esse nome passou de 80 caracteres.",
      emailInvalid: "Esse e-mail não parece válido.",
      companyMax: "O nome da empresa passou de 80 caracteres.",
      projectTypeInvalid: "Escolha um tipo de projeto da lista.",
      messageMin: "Conte um pouco mais — pelo menos 20 caracteres.",
      messageMax: "A mensagem passou de 5000 caracteres.",
      fileTooMany: "Você pode anexar no máximo 5 imagens.",
      fileTooLarge: 'A imagem "{name}" é grande demais mesmo depois de comprimida.',
      fileTotalTooLarge:
        "As imagens somadas passam do limite de envio. Tire uma e tente de novo.",
      fileWrongType: '"{name}" não é uma imagem PNG, JPG, WebP ou GIF.',
    },
  },

  footer: {
    builtWith: "Feito com Next.js, TypeScript e Tailwind CSS.",
    rights: "© {year} Victor Motta.",
    backToTop: "Voltar ao topo",
  },

  notFound: {
    title: "Página não encontrada",
    lead: "O endereço que você tentou abrir não existe (ou não existe mais).",
    back: "Voltar para o início",
  },
};

/** Formato do dicionário, derivado do português. */
export type Dictionary = typeof pt;

const en: Dictionary = {
  meta: {
    title: "Victor Motta — Full Stack Developer",
    description:
      "Portfolio of Victor Motta, full stack developer. Projects, stack, resume and direct contact.",
    localeTag: "en-US",
  },

  nav: {
    skipToContent: "Skip to content",
    home: "Home",
    about: "About",
    stack: "Stack",
    projects: "Projects",
    contact: "Contact",
    resume: "Resume",
    openMenu: "Open navigation menu",
    closeMenu: "Close navigation menu",
    toggleTheme: "Switch between light and dark theme",
    switchLanguage: "View this site in Portuguese",
    languageShort: "PT",
  },

  hero: {
    eyebrow: "Full Stack Developer",
    availability: "Available for new projects",
    headline: ["I build products", "that people", "can actually use."],
    lead:
      "From the database to the interface. I write software that survives production, loads fast and works for everyone — including people navigating by keyboard alone.",
    ctaProjects: "View projects",
    ctaResume: "Download resume",
    scrollHint: "Scroll to explore",
  },

  about: {
    eyebrow: "01 — About",
    title: "A developer who cares about what happens after the deploy",
    paragraphs: [
      "I'm a full stack developer and I work the whole cycle: data modeling, API, interface, and whatever breaks at three in the morning. I like real problems — the kind that require understanding the business before opening the editor.",
      "Accessibility and performance aren't decoration bolted on at the end. They go into the first architectural decision, because retrofitting them is expensive.",
      "When I'm not coding, I'm probably refactoring something that already worked.",
    ],
    photoAlt: "Portrait of Victor Motta",
    stats: {
      experience: "years of experience",
      projects: "projects delivered",
      focus: "current focus",
      focusValue: "Full Stack & DX",
    },
  },

  stack: {
    eyebrow: "02 — Stack",
    title: "The tools I reach for every day",
    lead:
      "Not a list of everything I've ever touched. This is what I use with confidence today, in production.",
    groups: {
      frontend: "Front-end",
      backend: "Back-end",
      data: "Data & Infra",
      tools: "Tooling",
    },
  },

  projects: {
    eyebrow: "03 — Projects",
    title: "Selected work",
    lead:
      "A few projects that show how I work. Click through for the full case study.",
    featured: "Featured",
    viewCase: "View case study",
    viewCaseOf: "View the full case study for {title}",
    liveDemo: "Live site",
    liveDemoOf: "Open {title} in a new tab",
    sourceCode: "Source",
    sourceCodeOf: "View the source code for {title} on GitHub",
    backToProjects: "Back to projects",
    role: "My role",
    year: "Year",
    stackLabel: "Stack",
    overview: "About the project",
    empty: "Projects are being prepared. Check back soon.",
    carousel: "Images from the {title} project",
    previousImage: "Previous image",
    nextImage: "Next image",
    imageCounter: "Image {current} of {total}",
    goToImage: "Go to image {number}",
  },

  contact: {
    eyebrow: "04 — Contact",
    title: "Let's talk about your project",
    lead:
      "Describe what you need and attach images, screens or references. I reply within one business day.",
    directTitle: "Prefer something more direct?",
    whatsapp: "Message on WhatsApp",
    whatsappAria: "Start a WhatsApp conversation with me",
    whatsappPrefill:
      "Hi Victor! I saw your portfolio and I'd like to talk about a project.",
    emailLabel: "Email",
    githubLabel: "GitHub",
    linkedinLabel: "LinkedIn",

    form: {
      name: "Your name",
      namePlaceholder: "What should I call you",
      email: "Your email",
      emailPlaceholder: "you@company.com",
      emailHint: "Only used to reply to this message.",
      company: "Company",
      companyOptional: "optional",
      companyPlaceholder: "Where you work",
      projectType: "Project type",
      projectTypes: {
        web: "Web application",
        mobile: "Mobile app",
        api: "API / back-end",
        consulting: "Consulting / code review",
        other: "Other",
      },
      message: "Message",
      messagePlaceholder:
        "Tell me what you want to build, the timeline you have in mind and what already exists today.",
      messageHint: "At least 20 characters.",
      files: "Project images",
      filesOptional: "optional",
      filesHint:
        "Up to 5 images. They are compressed automatically, so a raw phone screenshot is fine. Formats: PNG, JPG, WebP or GIF.",
      filesDrop: "Drag images here or click to choose",
      filesOptimizing: "Optimising images...",
      filesButton: "Choose images",
      filesSelectedOne: "1 image selected",
      filesSelectedMany: "{count} images selected",
      filesRemove: "Remove the image {name}",
      submit: "Send message",
      submitting: "Sending...",
      successTitle: "Message sent!",
      success:
        "Everything arrived and I'll reply within one business day. Thanks for reaching out.",
      sendAnother: "Send another message",
      errorTitle: "Couldn't send it",
      errorGeneric:
        "Something went wrong on the way out. Try again in a moment, or reach me on WhatsApp.",
      errorNetwork:
        "I couldn't reach the server. Check your connection and try again.",
      errorRateLimit:
        "You've sent a few messages just now. Please wait a few minutes before trying again.",
      errorTooLarge:
        "The images are too heavy to send. Remove one and try again.",
      errorConfig:
        "Email sending isn't configured yet. Fill in RESEND_API_KEY, CONTACT_TO_EMAIL and CONTACT_FROM_EMAIL in .env.local and restart the server. (This message only shows in development.)",
      requiredMark: "required",
    },

    validation: {
      nameMin: "Please write your name with at least 2 characters.",
      nameMax: "That name is over 80 characters.",
      emailInvalid: "That email doesn't look valid.",
      companyMax: "The company name is over 80 characters.",
      projectTypeInvalid: "Pick a project type from the list.",
      messageMin: "Tell me a bit more — at least 20 characters.",
      messageMax: "The message is over 5000 characters.",
      fileTooMany: "You can attach at most 5 images.",
      fileTooLarge: 'The image "{name}" is too large even after compression.',
      fileTotalTooLarge: "The images exceed the upload limit. Remove one and try again.",
      fileWrongType: '"{name}" is not a PNG, JPG, WebP or GIF image.',
    },
  },

  footer: {
    builtWith: "Built with Next.js, TypeScript and Tailwind CSS.",
    rights: "© {year} Victor Motta.",
    backToTop: "Back to top",
  },

  notFound: {
    title: "Page not found",
    lead: "The address you tried to open doesn't exist (or doesn't anymore).",
    back: "Back to home",
  },
};

const dictionaries: Record<Locale, Dictionary> = { pt, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
