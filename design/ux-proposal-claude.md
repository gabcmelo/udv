# UDV: proposta de UX com a bandeja em primeiro lugar

## 1. Diagnóstico do desvio

- A primeira versão tratou o UDV como um **dashboard** (sidebar, hero "Seu uso, à vista.", três métricas grandes e cards). A bandeja só abria essa janela.
- O pedido era outro: algo "como o OneDrive", um ícone perto do relógio com um **flyout compacto** que responde em segundos. O LimitBar mostra isso com linhas densas, uma barra fina por janela, "atualizado há X" e rodapé discreto.
- O dashboard grande tem valor, mas como consulta secundária. Cards com bloco de métricas somam coisas que não se somam, porque cada assinatura tem sua própria cota. Isso também puxa o produto para "olhar o painel" em vez de "bater o olho".

**Direção:** o flyout vira a interface principal. O painel grande vira uma visão opcional para gerenciar contas e comparar com folga.

## 2. Fluxo em três níveis

1. **Ícone com selo (sempre visível).** O selo só aparece quando há algo que merece ação. Cada selo tem forma própria, para não depender de cor:
   - círculo vermelho cheio: alguma conta esgotada;
   - triângulo âmbar: alguma conta perto do limite;
   - anel vazio: há contas sem dado confirmado (sem leitura, antiga, expirada, sem conexão ou para reconectar);
   - sem selo: todas as contas têm leitura recente e dentro do limite.
   O tooltip e o `aria-label` repetem o resumo em texto.
2. **Flyout de consulta rápida.** Clique no ícone abre e fecha. É a tela que responde "posso usar agora?".
3. **Painel completo (opcional).** Janela normal, aberta por "Abrir painel". É independente do flyout: abri-lo fecha o flyout e fechá-lo não afeta a bandeja. Concentra o que não cabe na consulta rápida: gerenciar, renomear, remover e comparar com mais espaço.

## 3. Dimensões e ancoragem do flyout

- **Largura 380 px** (faixa aceitável: 360–400). **Altura** segue o conteúdo, com teto de ~560 px e sempre abaixo da área útil do monitor. A lista rola; cabeçalho e rodapé ficam fixos.
- **Windows.** O flyout nasce na borda inferior (`transform-origin` embaixo à direita). Fica a ~12 px acima da taskbar e a ~12 px da borda direita da área útil, como os flyouts do Windows 11. Não precisa estar centralizado no ícone, porque a bandeja fica no canto.
- **Mac.** O flyout cai da barra de menus com ~6 px de folga e centra no ícone, com limite de 8 px nas bordas.
- **Posição da taskbar.** Calcular a partir de `workArea` do display que contém o ícone, não da tela inteira:
  - embaixo: abre para cima;
  - em cima: abre para baixo;
  - à esquerda ou à direita: abre ao lado do ícone, alinhado à borda interna da taskbar.
- **Vários monitores.** Escolher o display pelo ponto do ícone (`screen.getDisplayNearestPoint`). Se o ícone estiver no overflow da bandeja ou `tray.getBounds()` vier vazio, usar a posição do cursor no clique. Limitar a janela ao `workArea` desse display.
- **DPI e escala.** Trabalhar em DIPs do Electron, que cuidam de 125%, 150% e 200%. Não fixar altura em pixels físicos. Recalcular posição e altura máxima em `display-metrics-changed`. Em escala alta e tela pequena, o teto de altura manda e a lista rola.
- **Foco e tempo.** Fechar o flyout ao perder o foco (blur), exceto quando estiver fixado. Atenção à "corrida" clássica: o clique no ícone que causa o blur não deve reabrir o flyout logo em seguida.

## 4. Hierarquia: o que se lê em menos de 5 s

Cada conta é uma linha de duas camadas.

- **Camada 1 (cabeçalho da conta):** nome da conta (13 px, peso 600), estrela se favorita, tag de estado quando houver, provedor e plano em texto ("Claude Code, plano Max"), e à direita o frescor da leitura ("há 2 min").
- **Camada 2 (uma linha por janela fornecida):** rótulo da janela, barra fina, **"restam 62%"** e **"renova 16:40"**.

**Decisões para revisar:**

- A barra mostra o que **resta** (ela "esvazia"), e o número diz "restam". Isso responde ao que se quer saber ("quanto posso usar?"). O LimitBar mostra o usado. O detalhe expandido traz os dois ("38% usado, 62% restam"), então a inversão não esconde nada.
- Os rótulos de janela vêm do provedor ("5 h", "Semana", o que vier). Nada de 5h/semana fixos. Janela ausente simplesmente não aparece e é explicada no detalhe.
- O texto é 12–13 px, com números tabulares. A cor reforça (âmbar, vermelho), mas sempre vem com texto ou forma.

**Cabeçalho do flyout:** uma linha de contagem, sem hero e sem número grande, e o botão Fixar.

- Exemplo: "6 contas: 1 esgotada, 1 perto do limite, 1 para reconectar".
- Nunca "tudo ok" quando falta dado. Sem pendências, diz "4 contas, todas com leitura recente".
- **Sem média nem soma de percentuais.**

## 5. Várias contas sem virar dashboard

| | Agrupar por provedor (LimitBar) | Conta como unidade (recomendado) |
|---|---|---|
| Prós | Escaneia bem com 1 conta por provedor. | Reflete o modelo real: cada assinatura tem cota própria. Dois Codex diferentes não pertencem a "um bloco Codex". |
| Contras | Com N contas por provedor vira lista longa dentro de blocos e esconde urgência em outro bloco. | Perde o agrupamento visual por provedor. |

**Recomendação:** lista plana de contas, com o provedor como chip de duas letras e texto, sem logotipos. A ordem é:

1. favoritas, na ordem em que o usuário as fixou;
2. as demais por necessidade de atenção: esgotada, reconectar, perto do limite, sem conexão, expirada, sem leitura, antiga, ok.

- **Expandir:** clicar na linha abre o detalhe (e-mail, hora exata da leitura, usado e restante por janela, fonte, extras do provedor, ações). Só uma conta fica aberta por vez, para a altura continuar contida.
- **Favoritar:** no detalhe. A estrela aparece na linha. Favorita com problema continua mostrando o problema, porque o estado nunca é escondido pela posição.
- **Muitas contas (9+):** a lista rola dentro do teto de altura. Se o uso real mostrar contas demais, a evolução natural é colapsar as não favoritas e saudáveis em "mais N contas". Isso fica de fora agora (YAGNI) e entra só se a revisão pedir.
- **O painel grande** pode agrupar e filtrar por provedor, porque ali há espaço.

## 6. Estados

Princípio visual único: **tracejado e hachurado significam "não confirmado"**. Isso vale para barra, tag e anel do selo, e é o oposto de uma barra cheia, que significa "dado confirmado".

| Estado | Tag | Barra e números | Copy / ação |
|---|---|---|---|
| Conectado, leitura recente | nenhuma | Barra cheia, "restam N%" | "há 2 min" |
| Perto do limite (≥80% usado, leitura recente) | ▲ Perto do limite | Barra âmbar, número âmbar | Sem ação extra |
| Esgotado | ■ Esgotado | Barra vazia com contorno vermelho, "restam 0%", "renova 16:40" | Mostra quando volta |
| Reconectar | ○ Reconectar | Sem barras | "A sessão deste perfil terminou. Reconecte para voltar a ler os limites." + botão Reconectar |
| Sem conexão | Sem conexão (tracejada) | Última leitura esmaecida e hachurada | "Sem conexão com o Codex. Mostrando a última leitura, há 12 min." |
| Leitura antiga (≥45 min) | Leitura antiga (tracejada) | Barra esmaecida e hachurada. **Esgotado/perto do limite não são afirmados** com dado velho | Claude: "Os limites do Claude mudam depois de uma resposta no Claude Code." + Abrir Claude |
| Leitura expirada (a janela já deveria ter vencido) | Leitura expirada (tracejada) | Barra hachurada, **"—"**, "sem leitura nova". **Nunca mostra 100% restante nem "renovado"** | Detalhe: "A janela venceu às 09:40 e não há leitura nova que confirme a renovação." |
| Sem leitura | Sem leitura (tracejada) | **"—", nunca 0%** | Claude: "Ainda sem leitura. Envie uma mensagem no Claude Code deste perfil…" · Codex: "O Codex não informou limites para esta conta." |
| Vazio (nenhuma conta) | | | "Nenhuma conta conectada" + botão Adicionar conta; Atualizar desabilitado |

## 7. Comportamento e teclado

- **Clique no ícone** alterna o flyout. **Escape** fecha e devolve o foco ao ícone. **Clique fora** fecha (exceto fixado). Perder o foco da janela também fecha.
- **Teclado:** o ícone é um botão (Enter e Espaço), com `aria-expanded`. Ao abrir, o foco vai para a primeira conta, ou para "Adicionar conta" se estiver vazio. Ordem de foco: Fixar, contas, ações da conta aberta, Atualizar, Adicionar conta, Abrir painel. Setas ↑↓, Home e End movem entre contas. O foco circula dentro do flyout até Escape.
- **Fixar:** vale a pena. Quem acompanha uma sessão longa quer o flyout aberto ao lado do trabalho. Fixado, o clique fora não fecha. Escape, o ícone ou "Sair do fixado" fecham e **desfazem** o fixar, para a próxima abertura voltar ao comportamento padrão.
- **Menu de contexto do ícone** (botão direito ou tecla Menu): Abrir resumo, Abrir painel, Atualizar, Manter resumo fixado e **Sair do UDV**.
- **Três jeitos de "sair", sem ambiguidade:**
  - *fechar o popup* (Escape ou clique fora) só esconde o flyout;
  - *minimizar ou fechar o painel* esconde a janela grande e o UDV continua na bandeja;
  - *só "Sair do UDV"* encerra o app. Nada o encerra por acidente.
- **Rodapé:** Atualizar, Adicionar conta, Abrir painel, em texto discreto. "Sair" fica só no menu de contexto.

## 8. Honestidade sobre as fontes (copy)

- **Atualizar** relê o cache do Claude e consulta o Codex. Não gera leitura nova de Claude. A mensagem diz isso: "Releu o cache do Claude e consultaria o Codex agora. O Claude só muda depois de uma resposta no Claude Code."
- Quando o Claude está antigo, expirado ou sem leitura, a ação é **Abrir Claude**, com a explicação curta no lugar certo e sem jargão técnico (nada de status line na linha principal). O detalhe cita a fonte.
- Codex: consulta periódica pelo CLI. Campos ausentes aparecem como ausentes.
- Extras que o provedor informar (ex.: "2 resets disponíveis, o próximo expira qui 29 out") ficam só no detalhe.

## 9. Visual

- **Escuro e discreto**, fontes do sistema (`-apple-system`, "SF Pro Text", "Segoe UI Variable Text"), 12–13 px.
- Superfície grafite #202226, bordas #34373d, texto #eceef1, secundário #a2a8b1, barra neutra azul-acinzentada #aab3c2.
- Âmbar #e8b04a e vermelho #f0685c só para estados. Azul #7db4f0 só para ação e foco.
- **Sem o verde ácido nem o hero do dashboard anterior.**
- Os chips "Cl" e "Cx" são só identificação por texto, em tons dessaturados (lilás e menta). Não são logotipos nem imitam marcas.
- Um único movimento: abrir o flyout (fade e 8 px) e expandir a conta. Respeita `prefers-reduced-motion`.

## 10. Alternativas descartadas

- **Sidebar ou widget fixo no desktop:** contraria "como o OneDrive".
- **Flyout com uma conta selecionada e as outras num seletor:** esconde esgotamentos de outras contas.
- **Resumo grande de média ou total no flyout:** soma cotas que não se somam.
- **Agrupar por provedor também no flyout:** viável com 1–2 contas por provedor, mas deixa o problema em outro bloco quando N cresce. Fica reservado ao painel.
- **Flyout como janela nativa de bandeja do SO:** sem controle de conteúdo. Melhor uma `BrowserWindow` sem moldura, sem entrada na taskbar (`skipTaskbar`), `alwaysOnTop` e fechada ao perder o foco.

## 11. Fora do que existe hoje

Não há notificações, inicialização automática nem histórico. Se entrarem depois, ficam no painel grande. Nenhum deles aparece no protótipo, que mostra só o que o app já faz.

## 12. Critérios para revisar antes de implementar

1. Em 5 s, alguém acha qual conta está esgotada ou perto do limite e quando renova?
2. A lista com 9 contas continua legível e o teto de altura funciona sem rolagem dupla?
3. Dá para distinguir esgotada, leitura antiga, expirada e sem leitura **sem olhar as cores**?
4. "restam N%" com barra que esvazia está claro, ou o usuário prefere "usado"? (decisão aberta)
5. O resumo do cabeçalho, em lugar de "tudo ok", é suficiente nos cenários Atenção e Sem leitura?
6. O fluxo Fixar e Escape faz sentido? A diferença entre fechar popup, fechar painel e sair do app está explícita?
7. Tab e Escape funcionam sem mouse, e o foco volta ao ícone?
8. O painel grande parece secundário e dá para voltar ao flyout?
9. Validar em máquina Windows real (escala 150% e 200%, taskbar em outras posições, segundo monitor) e em Mac antes de fechar as medidas.

**Protótipo:** `prototypeHtml`. É um estudo de design com dados fictícios, que mostra a proposta. Não é a implementação. Os controles de sistema e de cenário ficam fora da UI proposta.