/**
 * Se o visitante está na ilha em 3D ou na página rolável.
 *
 * Mora fora do React porque a resposta vem de coisas que não são estado do
 * React — o suporte a WebGL do navegador e o que ficou salvo de visitas
 * anteriores — e porque dois componentes distantes precisam dela: o que monta
 * a ilha e o fundo voxel da página, que não pode ficar girando escondido
 * atrás dela. Dois contextos WebGL vivos ao mesmo tempo gastam bateria para
 * desenhar algo que ninguém vê.
 */

const CHAVE = "ilha";
const EVENTO = "ilha:mudou";

export type EstadoIlha = "on" | "off" | "indisponivel";

/* Cache do valor de agora. useSyncExternalStore exige que ler duas vezes
   seguidas devolva a mesma coisa, então a conta é feita uma vez só. */
let atual: EstadoIlha | null = null;

function suportaWebgl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function preferenciaSalva(): "on" | "off" | null {
  try {
    const valor = localStorage.getItem(CHAVE);
    return valor === "on" || valor === "off" ? valor : null;
  } catch {
    /* armazenamento bloqueado: a escolha vale só para esta visita */
    return null;
  }
}

export function assinarIlha(aoMudar: () => void) {
  const revalidar = () => {
    /* O evento de outra aba mexeu no armazenamento: refaz a conta. */
    atual = null;
    aoMudar();
  };
  window.addEventListener(EVENTO, aoMudar);
  window.addEventListener("storage", revalidar);
  return () => {
    window.removeEventListener(EVENTO, aoMudar);
    window.removeEventListener("storage", revalidar);
  };
}

/**
 * O estado de agora. Sem WebGL a ilha nem entra como opção: o portfólio
 * continua de pé como página em vez de virar uma tela preta.
 */
export function lerIlha(): EstadoIlha {
  if (atual !== null) return atual;
  if (!suportaWebgl()) {
    atual = "indisponivel";
    return atual;
  }
  /* Quem chega sem ter escolhido nada cai na ilha: é o portfólio. */
  atual = preferenciaSalva() ?? "on";
  return atual;
}

export function definirIlha(estado: "on" | "off") {
  atual = estado;
  try {
    localStorage.setItem(CHAVE, estado);
  } catch {
    /* sem armazenamento a escolha vale só para esta visita */
  }
  window.dispatchEvent(new Event(EVENTO));
}

/* No servidor não existe ilha: o HTML sai como página, e a ilha entra na
   hidratação. É o que mantém o primeiro render igual ao do servidor. */
export const lerIlhaNoServidor = (): EstadoIlha => "off";

/**
 * O aviso de que a troca de modo COMEÇOU, antes de ela acontecer.
 *
 * A ilha e o fundo da página rolável são duas cenas WebGL separadas, e nunca
 * estão vivas ao mesmo tempo — a de baixo é desmontada quando a de cima abre.
 * Uma câmera só, atravessando as duas, exigiria fundir os dois canvases.
 *
 * O que emenda as pontas é isto: quem sai se afasta, avisa, e quem entra
 * chega de perto e assenta. São duas metades de movimento no MESMO sentido,
 * e o olho lê as duas como um zoom só. É por isso que o aviso vem antes da
 * troca e não junto com ela: a metade de saída precisa de tempo para rodar.
 */
const EVENTO_TRANSICAO = "ilha:transicao";

export type ParaOnde = "ilha" | "pagina";

export function anunciarTransicao(para: ParaOnde) {
  window.dispatchEvent(new CustomEvent(EVENTO_TRANSICAO, { detail: para }));
}

export function assinarTransicao(aoTrocar: (para: ParaOnde) => void) {
  const ouvinte = (e: Event) => aoTrocar((e as CustomEvent<ParaOnde>).detail);
  window.addEventListener(EVENTO_TRANSICAO, ouvinte);
  return () => window.removeEventListener(EVENTO_TRANSICAO, ouvinte);
}

/** Quanto dura cada metade, em milissegundos. */
export const DURACAO_DA_TRANSICAO = 700;
