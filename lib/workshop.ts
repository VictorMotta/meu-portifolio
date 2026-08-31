/**
 * Números do mod na Oficina da Steam.
 *
 * Buscados no BUILD, não no navegador do visitante: a API da Steam não manda
 * cabeçalho de CORS, então uma chamada do lado do cliente falharia. Como o site
 * é estático, o número congela no deploy e atualiza no próximo. Para um
 * contador de inscritos isso é mais que suficiente.
 *
 * Se a Steam estiver fora do ar na hora do build, a função devolve null e a
 * seção simplesmente esconde os números, em vez de derrubar o build inteiro.
 */

const ENDPOINT =
  "https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/";

export type WorkshopStats = {
  subscriptions: number;
  favorited: number;
  views: number;
  updatedAt: string;
};

type RespostaSteam = {
  response?: {
    publishedfiledetails?: {
      result?: number;
      banned?: number;
      subscriptions?: number;
      favorited?: number;
      views?: number;
      time_updated?: number;
    }[];
  };
};

export async function getWorkshopStats(
  publishedFileId: string,
): Promise<WorkshopStats | null> {
  try {
    const corpo = new URLSearchParams({
      itemcount: "1",
      "publishedfileids[0]": publishedFileId,
    });

    const resposta = await fetch(ENDPOINT, {
      method: "POST",
      body: corpo,
      /* O Next cacheia fetch por padrão. Uma hora evita bater na Steam a cada
         página gerada no build, sem deixar o número velho demais. */
      next: { revalidate: 3600 },
    });

    if (!resposta.ok) return null;

    const dados = (await resposta.json()) as RespostaSteam;
    const item = dados.response?.publishedfiledetails?.[0];

    /* result 1 é sucesso. Item banido ou removido não entra no site. */
    if (!item || item.result !== 1 || item.banned === 1) return null;

    return {
      subscriptions: item.subscriptions ?? 0,
      favorited: item.favorited ?? 0,
      views: item.views ?? 0,
      updatedAt: item.time_updated
        ? new Date(item.time_updated * 1000).toISOString()
        : "",
    };
  } catch {
    return null;
  }
}
