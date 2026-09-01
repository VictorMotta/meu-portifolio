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
 * Dicionário de textos. O objeto `pt` define o formato. `en` é tipado contra
 * ele, então esquecer de traduzir uma chave vira erro de compilacao, não um
 * buraco silencioso na página.
 */
const pt = {
	meta: {
		title: "Victor Motta | Desenvolvedor Full Stack",
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
		hobby: "Mods",
		/* Só o fliperama usa: é o título da parada dele na ilha, que não tem
       item de menu. Mora aqui porque é rótulo de parada, como os outros. */
		games: "Jogos",
		resume: "Currículo",
		openMenu: "Abrir menu de navegação",
		closeMenu: "Fechar menu de navegação",
		toggleTheme: "Alternar entre tema claro e escuro",
		switchLanguage: "Ver este site em inglês",
		languageShort: "EN",
		ligar3d: "Ligar o 3D",
		desligar3d: "Desligar o 3D",
	},

	hero: {
		eyebrow: "Desenvolvedor Full Stack",
		availability: "Disponível para novos projetos",
		headline: ["Desenvolvedor", "full stack.", "Node, React, AWS."],
		lead: "Hoje trabalho numa plataforma para clínicas. Antes disso passei três anos na AgriSafe, mexendo com microservices na AWS e análise de imagem de satélite.",
		ctaProjects: "Ver projetos",
		ctaResume: "Baixar currículo",
		scrollHint: "Role para explorar",
	},

	about: {
		eyebrow: "01 / Sobre",
		title: "Full stack, com mais tempo no back-end",
		/* A ordem é do presente para o passado, e isso é de propósito: antes o
       emprego de agora aparecia numa oração subordinada no fim do primeiro
       parágrafo e o texto inteiro falava da AgriSafe. Quem lê um portfólio
       quer saber primeiro o que a pessoa faz hoje.

       Os três primeiros são também o que o currículo mostra (`slice(0, 3)`),
       então eles têm de funcionar sozinhos como resumo profissional. O quarto
       é opinião, e opinião fica fora de currículo. */
		paragraphs: [
			"Trabalho com desenvolvimento web desde 2022. Comecei no bootcamp da Driven, passei três anos na AgriSafe como engenheiro de software e estou na Tiix desde junho de 2026.",
			"Na Tiix sou o engenheiro de software full stack e trabalho com: PHP no back-end, HTML e CSS com Bootstrap no front e MySQL no banco.",
			"Na AgriSafe foram três anos em Node, TypeScript e Python. Construí crawlers, filas com SQS e Redis, e análises geoespaciais com PostGIS e Google Earth Engine. Foi lá que aprendi a lidar com sistema que precisa aguentar volume.",
			"Gosto mais de back-end, mas não fujo do front. Também dou atenção a acessibilidade: boa parte dos sites que eu abro não funciona direito só com o teclado.",
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
		eyebrow: "02 / Stack",
		title: "As ferramentas que uso todo dia",
		lead: "O que eu uso no dia a dia. Deixei de fora o que só encostei uma vez.",
		groups: {
			frontend: "Front-end",
			backend: "Back-end",
			data: "Dados & Infra",
			tools: "Ferramentas",
		},
		selecione: "Escolha uma tecnologia para ver a ficha",
		dicaSetas: "clique num ícone, ou use as setas do teclado",
		dominio: "Domínio",
		frequencia: "Frequência de uso",
		pontos: "{valor}/100",
	},

	projects: {
		eyebrow: "03 / Projetos",
		title: "Trabalhos selecionados",
		lead: "Alguns projetos que já entreguei. Clique para ver os detalhes de cada um.",
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
		eyebrow: "05 / Contato",
		title: "Vamos conversar sobre o seu projeto",
		lead: "Me conte o que você precisa. Se tiver telas ou referências, pode anexar. Costumo responder no mesmo dia.",
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
			messageMin: "Conte um pouco mais. O mínimo é 20 caracteres.",
			messageMax: "A mensagem passou de 5000 caracteres.",
			fileTooMany: "Você pode anexar no máximo 5 imagens.",
			fileTooLarge:
				'A imagem "{name}" é grande demais mesmo depois de comprimida.',
			fileTotalTooLarge:
				"As imagens somadas passam do limite de envio. Tire uma e tente de novo.",
			fileWrongType: '"{name}" não é uma imagem PNG, JPG, WebP ou GIF.',
		},
	},

	hobby: {
		eyebrow: "04 / Fora do expediente",
		title: "Escrevo mods para Project Zomboid",
		lead: "Jogo Zomboid há anos e acabei descobrindo que dá para mexer no jogo por dentro. O primeiro mod virou algo que outras pessoas usam.",
		modResumo:
			"Acelera ações demoradas do jogo (fabricar, construir, reparar, desmontar) sem adiantar o relógio. Vanilla tem o botão de acelerar tempo, mas ele queima o dia inteiro, e em multiplayer nem existe. Cinco velocidades configuráveis, uma por tipo de ação, decididas por quem administra o servidor.",
		modPreviewAlt: "Ícone do mod Turbo Actions na Oficina da Steam",
		inscritos: "inscritos na Workshop",
		favoritos: "favoritos",
		linhasLua: "linhas de Lua",
		verNaWorkshop: "Ver na Oficina",
		verManual: "Manual completo",
		voltarParaMods: "Voltar para os mods",
		manualEyebrow: "Manual do mod",
		comoFunciona: "A parte esperta",
		comoFuncionaTexto:
			"Toda ação temporizada do jogo passa por um único método antes de começar. Achar esse ponto foi o trabalho: enganchar nele alcança fabricação, construção, reparo e desmonte de uma vez, sem precisar mexer em cada classe.",
		jogos: "O que eu jogo",
	},

	ilha: {
		titulo: "A ilha",
		intro: "Escolha um lugar da ilha para explorar.",
		dica: "Use as setas do teclado para trocar de lugar, ou Esc para voltar à vista geral.",
		voltar: "Voltar à vista geral",
		arrumar: "Arrumar a ilha ({n})",
		dicaMouse:
			"Arraste para girar. Clique num móvel para abrir a seção, numa lamparina para acender ou apagar, ou numa coisa da mesa para derrubar.",
		voltarCurto: "Vista geral",
		fechar: "Fechar este painel",
		verComoPagina: "Ver como página",
		verComoPaginaDica: "Sair da ilha e ler o portfólio em formato de página",
		entrarNaIlha: "Entrar na ilha",
		carregando: "Montando a ilha…",
		semWebgl:
			"Este navegador não consegue desenhar a ilha em 3D. O portfólio continua completo abaixo.",
		telas: {
			sobre: "Monitor da esquerda",
			stack: "Quadro branco",
			projetos: "Quadro de projetos",
			mods: "TV da sala",
			jogos: "Fliperama",
			contato: "Monitor da direita",
			curriculo: "Cavalete",
		},
		/* A tela do fliperama é a única parada que também é brinquedo. `comandos`
       é desenhado dentro da tela, na fonte de bloco, que não tem acento nem
       minúscula — por isso já vem escrito assim. O resto é falado por leitor
       de tela, e aí vale a grafia certa. */
		fliperama: {
			tela: "Fliperama: um joguinho de nave. Aperte Enter ou clique para jogar.",
			jogando:
				"Jogando. As setas ou WASD movem a nave, espaço atira, Esc fecha o painel.",
			comandos: "SETAS OU WASD MOVEM  ESPACO ATIRA",
			perdeuVida: "Nave atingida. Restam {n} vidas.",
			fim: "Fim de jogo, {n} pontos.",
			venceu: "Fase concluída, {n} pontos.",
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
		title: "Victor Motta | Full Stack Developer",
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
		hobby: "Mods",
		/* Only the arcade uses it: the title of its island stop, which has no
       menu item. It lives here because it is a stop label, like the rest. */
		games: "Games",
		resume: "Resume",
		openMenu: "Open navigation menu",
		closeMenu: "Close navigation menu",
		toggleTheme: "Switch between light and dark theme",
		switchLanguage: "View this site in Portuguese",
		languageShort: "PT",
		ligar3d: "Turn 3D on",
		desligar3d: "Turn 3D off",
	},

	hero: {
		eyebrow: "Full Stack Developer",
		availability: "Available for new projects",
		headline: ["Full stack", "developer.", "Node, React, AWS."],
		lead: "Right now I work on a platform for medical clinics. Before that I spent three years at AgriSafe, on AWS microservices and satellite imagery analysis.",
		ctaProjects: "View projects",
		ctaResume: "Download resume",
		scrollHint: "Scroll to explore",
	},

	about: {
		eyebrow: "01 / About",
		title: "Full stack, with more hours on the back-end",
		paragraphs: [
			"I have been building for the web since 2022. I started at the Driven bootcamp, spent three years at AgriSafe as a software engineer and have been at Tiix since June 2026.",
			"At Tiix, I am a full-stack software engineer and I work with: PHP on the back-end, HTML and CSS with Bootstrap on the front, and MySQL for the database.",
			"AgriSafe was three years of Node, TypeScript and Python. I built crawlers, queues with SQS and Redis, and geospatial analysis with PostGIS and Google Earth Engine. That is where I learned to handle systems that have to take real volume.",
			"I lean towards the back-end, but I do not avoid the front. I also pay attention to accessibility: plenty of the sites I open do not work properly with a keyboard alone.",
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
		eyebrow: "02 / Stack",
		title: "The tools I reach for every day",
		lead: "What I reach for day to day. I left out anything I only touched once.",
		groups: {
			frontend: "Front-end",
			backend: "Back-end",
			data: "Data & Infra",
			tools: "Tooling",
		},
		selecione: "Pick a technology to see its card",
		dicaSetas: "click an icon, or use the arrow keys",
		dominio: "Command",
		frequencia: "How often I use it",
		pontos: "{valor}/100",
	},

	projects: {
		eyebrow: "03 / Projects",
		title: "Selected work",
		lead: "A few projects I have shipped. Click through for the details of each one.",
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
		eyebrow: "05 / Contact",
		title: "Let's talk about your project",
		lead: "Tell me what you need. If you have screens or references, attach them. I usually reply the same day.",
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
			messageMin: "Tell me a bit more. The minimum is 20 characters.",
			messageMax: "The message is over 5000 characters.",
			fileTooMany: "You can attach at most 5 images.",
			fileTooLarge: 'The image "{name}" is too large even after compression.',
			fileTotalTooLarge:
				"The images exceed the upload limit. Remove one and try again.",
			fileWrongType: '"{name}" is not a PNG, JPG, WebP or GIF image.',
		},
	},

	hobby: {
		eyebrow: "04 / After hours",
		title: "I write mods for Project Zomboid",
		lead: "I have played Zomboid for years and eventually found out you can get inside the game. The first mod turned into something other people use.",
		modResumo:
			"Speeds up long in-game actions (crafting, building, repairing, dismantling) without moving the clock. Vanilla has a fast-forward button, but it burns the whole day, and in multiplayer it does not exist at all. Five configurable speeds, one per action type, decided by whoever runs the server.",
		modPreviewAlt: "Icon of the Turbo Actions mod on the Steam Workshop",
		inscritos: "Workshop subscribers",
		favoritos: "favourites",
		linhasLua: "lines of Lua",
		verNaWorkshop: "View on Workshop",
		verManual: "Full manual",
		voltarParaMods: "Back to mods",
		manualEyebrow: "Mod manual",
		comoFunciona: "The clever bit",
		comoFuncionaTexto:
			"Every timed action in the game passes through a single method before it starts. Finding that point was the work: hooking it reaches crafting, building, repairing and dismantling at once, without touching each class.",
		jogos: "What I play",
	},

	ilha: {
		titulo: "The island",
		intro: "Pick a spot on the island to explore.",
		dica: "Use the arrow keys to move between spots, or Esc to go back to the wide shot.",
		voltar: "Back to the wide shot",
		arrumar: "Tidy up the island ({n})",
		dicaMouse:
			"Drag to spin. Click a piece of furniture to open its section, a lamp to switch it on or off, or something on the desk to knock it over.",
		voltarCurto: "Wide shot",
		fechar: "Close this panel",
		verComoPagina: "Read as a page",
		verComoPaginaDica:
			"Leave the island and read the portfolio as a normal page",
		entrarNaIlha: "Enter the island",
		carregando: "Building the island…",
		semWebgl:
			"This browser cannot draw the island in 3D. The full portfolio is right below.",
		telas: {
			sobre: "Left monitor",
			stack: "Whiteboard",
			projetos: "Project board",
			mods: "Living room TV",
			jogos: "Arcade cabinet",
			contato: "Right monitor",
			curriculo: "Easel",
		},
		fliperama: {
			tela: "Arcade cabinet: a little shoot'em up. Press Enter or click to play.",
			jogando:
				"Playing. Arrow keys or WASD move the ship, space fires, Esc closes the panel.",
			comandos: "ARROWS OR WASD MOVE  SPACE FIRES",
			perdeuVida: "Ship hit. {n} lives left.",
			fim: "Game over, {n} points.",
			venceu: "Stage cleared, {n} points.",
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
