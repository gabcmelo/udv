# Anéis de limite: três variantes para comparar no protótipo

Só protótipo. Nada de `src/` nem `electron/` foi tocado. Não consegui renderizar o CSS e o JS, então nada foi verificado no navegador. A verificação visual é do coordenador.

## Recomendação

**Variante A (donut por linha de limite).** Ela troca a barra pelo anel e mantém a estrutura que o usuário aprovou: uma linha por janela, com o texto à direita. Os anéis dão leitura de forma sem forçar o olho a ler números, e a conta continua com altura previsível.

- **B** é o gráfico mais legível, mas deixa a conta cerca de 3 vezes mais alta que a barra atual. Só compensa se o flyout tiver poucas contas.
- **C** é o gráfico mais compacto (um conjunto por conta), mas o usuário precisa casar cor e legenda. Pesa contra a regra de que cor é apoio, e piora com 3 janelas.

## Semântica (igual nas três)

- O anel mostra o **consumido**: começa às 12h, vai no sentido horário, e fechar é chegar ao limite. O texto sempre traz `usado N%` e `restam M%`.
- Cada janela é independente. Não há soma nem média de 5 h com semana.
- A cor identifica a **posição** da janela na conta (1ª azul, 2ª violeta, 3ª verde), nunca o estado. O rótulo textual é obrigatório em todas as variantes.
- Âmbar e vermelho ficam reservados aos estados. Estado também tem ícone e texto, no centro do anel:
  - ▲ perto do limite (≥80%);
  - ■ esgotada, com anel cheio e a palavra "esgotada" na linha de apoio;
  - relógio para leitura antiga, com anel atenuado e "leitura antiga" no texto;
  - traço (—) com anel tracejado para sem leitura ou vencida, nunca 0% e nunca "renovada".
- Conta sem janela nenhuma mostra um anel tracejado neutro com "—" e "sem leitura".
- Sem animação. A barra de variantes e a legenda ficam fora da proposta.

## Densidade e legibilidade

| | Altura por conta com 2 janelas | Observação |
|---|---|---|
| Barra atual | ~42 px | Referência |
| A | ~68 px | Anel de 28 px e duas linhas por janela |
| B | ~125 px | Anel de 54 px e quatro linhas de legenda |
| C | ~68 px (2 janelas) e ~102 px (3 janelas) | Anel de 56/68 px com legenda lateral |

Os valores são estimativas feitas pelo código, não medidas. Com 4 contas o flyout A fica em torno de 490 px, perto do teto de 560 px. Com 5 ou mais, a lista rola.

## O que o protótipo faz

- Variantes por `?variant=A/B/C`, com botões A/B/C, setas ‹ › e as setas ← → do teclado (ignoradas em campos de texto e no menu de contexto). A URL é atualizada com `history.replaceState`. Também aceita `?scenario=extremes`.
- A barra de variantes mostra a variante atual, uma explicação curta e a legenda de semântica, dentro do bloco de controles do estudo.
- Troca entre variantes funciona no flyout e no painel, em todos os cenários, incluindo Erro e Sem leitura.
- **Cenário Extremos:** 0%, 100% e uma terceira janela semanal por modelo (Sonnet e Opus), em contas Claude e Codex.
- **Textos do Claude (agora só no protótipo):** consulta automática do `/usage` a cada 20 min, manual após 1 min e respeitando bloqueios, sem precisar enviar mensagem. Isso vale para o aviso de sem leitura, o de leitura antiga, a linha "Fonte" e o retorno de "Atualizar". Nos avisos do Claude o link "Abrir Claude" virou "Atualizar".
- Os estados, avisos, tags, favoritos, ações, painel, temas, Windows/macOS e transparência reduzida seguem iguais. O código ainda tira as linhas de janela de `wins()` com uma expressão regular (`ROW`) e as refaz, para não alterar os avisos.

## Limitações e pontos abertos

- Pode sobrar texto antigo sobre "enviar mensagem" fora do script, por exemplo no HTML estático. Eu só vi o trecho do script. Uma busca por "mensagem" e "resposta no Claude" no arquivo resolve.
- Vidro, grão e blur continuam simulados no navegador.
- Os anéis são SVG nativo e não dependem de biblioteca. A cor dos anéis para daltonismo não foi testada. A distinção depende do rótulo e dos ícones, não da cor.
- **Atualizar com a regra de 1 min:** o protótipo não simula o bloqueio. Na implementação, convém desabilitar o botão e mostrar "disponível em N s" ou o motivo do bloqueio. É uma decisão de UX ainda aberta.
- O ícone de relógio no centro do anel de 28 px mede ~7 px e pode ficar pequeno. Vale conferir no flyout real, em 100% e 150% de escala.

## Para a revisão

1. Em A, dá para ler os 3 números de cada janela (usado, restam, renova) em menos de 5 s?
2. Em B, a altura extra se justifica com 4 contas ou mais?
3. Em C, a legenda se entende sem olhar a cor?
4. O Extremos (0%, 100%, 3 janelas) fica claro nas três variantes e nos dois temas?
