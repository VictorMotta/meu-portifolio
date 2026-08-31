Acelera ações demoradas — fabricar, construir, consertar, desmontar — sem adiantar o relógio do jogo. A ação fica rápida; o mundo não passa.


## O que ele faz, e por que existe


Desmontar uma casa, forjar um lote de facas, ler uma pilha de livros: no Project Zomboid isso custa horas de jogo. Em single player você tem o botão de acelerar tempo, mas ele **gasta mundo** — passa fome, escurece, comida estraga, bateria descarrega.


Em multiplayer você não tem nem isso. A vanilla desiste na primeira linha de client/ISUI/SpeedControlsHandler.lua:


```lua
SpeedControlsHandler.onKeyPressed = function(key)
    if isClient() then
        return;
    end
```


O Turbo Actions resolve os dois casos pelo mesmo caminho: acelera só a **ação**, e deixa o relógio em paz. Nenhum dia é queimado.


## Por que ele existe


Fiz esse mod porque não achei nenhum que deixasse ajustar **cada tipo de ação separadamente**. O que existe acelera tudo por igual, com um número só.


Eu queria o que outros jogos fazem há anos. No ARK você monta um servidor e define a taxa de domesticação em um valor, a de experiência em outro, a de colheita em outro — cada coisa no seu ritmo, porque nem toda parte do jogo precisa correr na mesma velocidade.


No meu servidor eu queria fabricação rápida e o resto normal. Não dá: em multiplayer o Project Zomboid não tem nem acelerar o tempo. O Turbo Actions foi a solução que achei — uma velocidade por tipo de ação, escolhida por quem administra o mundo.


É também o meu primeiro mod de Project Zomboid. Se você achar um bug, se algo não acelerar quando deveria, ou se tiver ideia de melhoria, comente na página da Oficina — e, se der, cole junto o trecho do seu console.txt onde aparece `[TurboActions]`.


## Instalação



      - Ative **Turbo Actions** na tela de Mods do menu principal.

      - Pode adicionar a um save existente, e pode remover depois. Nada é gravado no mundo além das opções de sandbox.

      - Em servidor, o mod precisa estar na lista de mods **do servidor e do cliente**.




## Configurar em single player



      - **Novo Jogo** e escolha o mapa.

      - Na tela **Opções do Sandbox**, procure **Turbo Actions** na lista da esquerda, abaixo de Pecuária.

      - Ajuste a velocidade de cada tipo de ação. Todos começam em **30x**.

      - Crie o mundo. As velocidades ficam gravadas nele.




As opções de sandbox pertencem ao mundo, então mudar depois de criado exige um mundo novo — ou editar o arquivo de save à mão. Se você costuma experimentar, vale criar um mundo de teste separado.


## Configurar em multiplayer



      - No menu principal, abra a configuração do servidor e escolha a configuração que você usa (por exemplo `servertest`).

      - Na árvore da esquerda, dentro de **Sandbox**, clique em **Turbo Actions**.

      - Defina a velocidade de cada tipo. É o admin quem decide: o jogador não escolhe velocidade, só liga e desliga o turbo dele.

      - Salve e suba o servidor.




Se você quer fabricação rápida mas construção normal, ponha **Velocidade da fabricação** em 30x e **Velocidade da construção** em Desligado. Cada tipo é independente.


Só a construção pede atenção extra em multiplayer — veja o aviso mais abaixo.


## As cinco opções



| Opção | Valores | Padrão | Alcança |
|---|---|---|---|
| Velocidade da fabricação | Desligado · 2x · 5x · 10x · 30x · 100x | 30x | bancada, forja, costura, cozinha, máquinas de processar |
| Velocidade da construção | idem | 30x | parede, piso, cerca, construção de várias etapas |
| Velocidade dos reparos | idem | 30x | arma, roupa, gerador, peça de veículo |
| Velocidade de desmontar | idem | 30x | desmontar móvel, demolir construção |
| Velocidade do resto | idem | 30x | ler, cavar, pescar, forragear — tudo fora das categorias acima |



Colocar um tipo em **Desligado** é o mesmo que desmarcá-lo: aquela categoria roda na velocidade normal do jogo.


## No jogo


Um indicador pequeno aparece abaixo do relógio, no canto superior direito. **Âmbar** significa turbo ligado; cinza, desligado. O canto direito dele mostra *até 30x* ou *desligado*, e o tooltip lista o que este mundo liberou.



      - [ liga e desliga o turbo.

      - \ esconde e mostra o indicador.

      - Clicar no botão **TURBO** faz o mesmo que a tecla.

      - Arraste o indicador para onde quiser — a posição fica salva.




As teclas são remapeáveis em **Opções › Teclas**, seção [Turbo Actions], e valem sem reiniciar. Ligar e desligar funciona também em multiplayer: desligar nunca é vantagem, então não faz sentido travar.


Os nomes dos atalhos aparecem em inglês mesmo com o jogo em português. Não é descuido: o Project Zomboid desenha o nome do atalho exatamente como o mod o registrou, sem passar por tradução. É limitação do jogo, não do mod.



### O caso da construção em multiplayer


Construir é a única ação em que o **servidor** manda na duração. Em ISBuildAction a vanilla faz:


```lua
if isClient() then o.maxTime = -1 end    -- servidor decide

-- e depois:
local duration = getActionDuration(self.transactionId)
if duration > 0 then
    self.maxTime = duration
    self.action:setTime(self.maxTime)    -- não passa pelo mod
end
```


O mod força a aceleração pelo lado do cliente, o que funciona — mas faz ele terminar antes da confirmação do servidor. A peça pode aparecer e sumir, ou a ação ser rejeitada. Se isso acontecer no seu servidor, ponha **Velocidade da construção** em **Desligado**: as outras quatro continuam funcionando normalmente.


Não existe uma caixinha separada para ligar esse comportamento, e é de propósito. Configuração de sandbox é por mundo: um servidor que põe a construção acima de Desligado já escolheu isso para si, e o seu mundo de single player nunca é afetado pela escolha do servidor. Uma segunda opção só criaria confusão e, pior, faria a opção de construção mentir em multiplayer quando ficasse desligada.


Em single player não há risco nenhum: ali a duração nasce local e passa pelo caminho normal. Fabricar, consertar e desmontar não têm esse problema em nenhum modo.




## Onde acelera



| Ação | Single player | Multiplayer |
|---|---|---|
| Fabricar | sim | sim |
| Consertar | sim | sim |
| Desmontar e demolir | sim | sim |
| Ler, cavar, pescar, forragear | sim | sim |
| Construir | sim | sim, com a ressalva acima |




## Como funciona por dentro


O mod substitui ISBaseTimedAction:adjustMaxTime, que a 42.20.4 chama a partir de `create()` para toda ação temporizada. Existe uma única definição desse método em toda a media/lua da vanilla — nenhuma subclasse o sobrescreve — então um só ponto alcança o jogo inteiro.


Para saber *qual* ação está rodando, o mod lê `action.Type`. Todo `ISBaseObject:derive(nome)` grava esse campo, então a classificação por categoria é exata, não adivinhada por nome de arquivo ou heurística.


Escrito e testado contra o Lua da 42.20.4, não portado de tutorial de Build 41.

    Turbo Actions 0.9.0 · Victor Motta · Português e English
