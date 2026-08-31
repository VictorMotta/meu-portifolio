/**
 * Seção "Fora do expediente": o que eu faço quando não estou trabalhando.
 *
 * Separado do resto porque tem linguagem visual própria. A parte profissional
 * do site continua sóbria; aqui pode ter voxel e cor de HUD de jogo.
 */

export const MOD_WORKSHOP_ID = "3791633320";

export const mod = {
  nome: "Turbo Actions",
  workshopUrl: `https://steamcommunity.com/sharedfiles/filedetails/?id=${MOD_WORKSHOP_ID}`,
  /* Manual dentro do próprio site. O slug casa com content/mods/. */
  manualSlug: "turbo-actions",
  preview: "/hobby/turbo-actions-preview.png",
  versao: "0.9.0",
  buildDoJogo: "Build 42 (42.20.4)",
  linhasDeLua: 606,
  tags: ["Lua", "Project Zomboid", "Build 42", "Multiplayer"],
} as const;

/**
 * O gancho que faz o mod funcionar. Copiado do arquivo real, encurtado só
 * para caber na tela: tirei o diagnóstico e as guardas de "não é o jogador
 * local", que não ajudam a entender a ideia.
 */
export const trechoLua = `-- Todo o mod depende de UM ponto: adjustMaxTime é chamado
-- por ISBaseTimedAction:create() para TODA ação temporizada,
-- e na 42.20.4 existe uma única definição em toda a media/lua.
local original = ISBaseTimedAction.adjustMaxTime

function ISBaseTimedAction:adjustMaxTime(maxTime)
    local result = original(self, maxTime)

    -- maxTime <= 1 quer dizer "duração definida depois".
    -- A própria vanilla só aplica modificador acima disso.
    if type(result) ~= "number" or result <= 1 then
        return result
    end

    -- self.Type carrega o nome da classe da ação, porque
    -- ISBaseObject:derive(type) guarda o.Type = type.
    -- É assim que o filtro por tipo é exato, e não chutado.
    local mult = TurboActions.getMultiplierFor(self)
    if mult <= 1 then return result end

    result = result / mult
    return result < 1 and 1 or result
end`;

/**
 * Os jogos, agrupados. Com sete títulos numa lista corrida a seção fica
 * comprida e ninguém lê; por categoria dá para bater o olho.
 *
 * Os rótulos vêm nos dois idiomas aqui mesmo em vez de irem para o i18n:
 * são quatro strings curtas que só existem nesta seção.
 */
export const jogos: {
  rotulo: { pt: string; en: string };
  itens: string[];
  nota?: { pt: string; en: string };
}[] = [
  {
    rotulo: { pt: "O favorito", en: "The favourite" },
    itens: ["The Last of Us"],
  },
  {
    rotulo: { pt: "Sobrevivência", en: "Survival" },
    itens: [
      "Project Zomboid",
      "ARK: Survival Evolved",
      "Rust",
      "The Forest",
      "Minecraft",
    ],
    nota: {
      pt: "O sistema de taxas do ARK, uma velocidade para cada coisa, foi o que me deu a ideia do Turbo Actions.",
      en: "ARK's rate system, one speed per thing, is where the idea for Turbo Actions came from.",
    },
  },
  {
    rotulo: { pt: "Extração", en: "Extraction" },
    itens: ["ARC Raiders"],
  },
  {
    rotulo: { pt: "MOBA", en: "MOBA" },
    itens: ["League of Legends"],
  },
];
