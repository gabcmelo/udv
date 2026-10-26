# Verificação do design implementado — UDV 0.2.0

## Alvo e evidências

- Referência aprovada: `design/preview-native-windows.png` (estudo com Acrylic real, 382 × 481 pixels capturados).
- Implementação: `test-results/popup-native.png` (382 × 500 pixels capturados), janela de 380 DIPs de largura, altura automática, quatro contas de demonstração.
- Comparação conjunta: `test-results/design-comparison.png`, aberta e inspecionada com referência e implementação lado a lado. As imagens não foram redimensionadas; a pequena borda do compositor está presente em ambas.
- Painel secundário: `test-results/panel-native.png`, capturado no sistema real; modos claro/escuro, filtros, busca e preferências também foram inspecionados.
- Estado comparado: Windows, escuro, quatro contas, recolhidas, mesmo conjunto de percentuais e ícones. Os horários de renovação e a idade das leituras são dinâmicos na implementação. O aviso persistente de demonstração é uma diferença intencional: precisa identificar dados fictícios dentro do produto, enquanto o estudo os identificava no título/controles externos.

## Histórico de comparação

1. Primeira captura: a superfície Acrylic muito transparente permitia que fundos claros/coloridos reduzissem o contraste do texto secundário. **[P2]** Foram observadas razões aproximadas de 2,6–4,4:1 em pontos de fundo do popup.
2. Correção: tonalidade de superfície escura reforçada (`rgba(22,22,22,.66)`) e clara (`rgba(250,250,250,.82)`), preservando o material nativo abaixo. Não foi adicionado blur CSS nem textura falsa sobre o Acrylic.
3. Nova captura, mesma janela e estado: os pontos amostrados ficaram em aproximadamente **6,2–8,5:1** para o texto secundário nominal `#b9bec7`. O novo par foi comparado lado a lado. Esse cálculo é uma amostragem da captura, não uma certificação de todos os fundos possíveis do sistema.

## Superfícies verificadas

- **Tipografia:** fonte de sistema, nomes de conta em 13px/600, informações operacionais em 12px, números tabulares, renovação em 11,5px para caber sem ocultar o horário. Sem slogans ou hero. A renovação e os nomes longos têm tratamento de overflow.
- **Layout:** largura 380 DIPs, linhas contínuas, barras de 4px, detalhes expansíveis, rodapé persistente com três ações. A altura se adapta ao conteúdo até 560 DIPs e fica limitada à área útil do monitor; a lista rola, sem esconder o rodapé.
- **Cores e material:** Acrylic nativo no popup Windows, Mica no painel, tema do sistema/claro/escuro, fallback sólido com transparência reduzida e alto contraste. Sem sombras e cards por conta. Diferenças de coloração entre capturas vêm do conteúdo real atrás do material.
- **Ícones:** mesmos assets oficiais Claude e ChatGPT/OpenAI do estudo; SVG claro/escuro sem filtros de inversão ou alterações de proporção, PNG Claude transparente. Ícones de ação vêm de Lucide, com escala e espessura compatíveis com o estudo.
- **Conteúdo:** percentual restante explícito, usado no detalhe, renovação local e frescor por conta. Cache antigo nunca produz badge “saudável” ou “esgotada” confirmado. Janela expirada mostra “—”; ausência não vira 0%. No Claude, Atualizar não promete uma nova leitura independente do uso do CLI.
- **Interações:** clique de bandeja, abrir painel, cadastro na primeira abertura, filtros, busca, expansão, teclado/setas/Escape, fixar/desafixar, blur, duas contas do mesmo provedor, favoritos e renomeação persistentes, sincronização das janelas, preferências e modo demonstração separado das contas reais. Cobertos pelo smoke em Electron real.
- **Erros de console:** nenhum `pageerror` nos dois renderizadores durante o smoke.

## Verificações adicionais

- 15 testes unitários passaram: conectores, isolamento, persistência, estados de leitura, resumo da bandeja e geometria do popup.
- Geometria exercitada com taskbar embaixo, em cima e lateral, monitor em coordenadas negativas, área útil reduzida e conteúdo maior que o limite. São testes de cálculo, não testes físicos em todos esses ambientes.
- Build TypeScript/Vite passou. Nenhum login ou chamada de modelo foi iniciado pelos testes.
- O executável Windows empacotado 0.2.0 também passou no smoke: resumo de 380px, preload, material/preferências e demonstração. O cadastro e o estado original da demonstração foram preservados.

## Limites e refinamentos não bloqueantes

- **[P3] macOS:** a integração opcional de `electron-liquid-glass` usa `addView` e a API pública do módulo, sem métodos `unstable_*`. Não há Mac disponível nesta sessão: build, assinatura, refração real e acessibilidade do macOS precisam ser validados lá. O fallback implementado é Vibrancy, ou sólido quando a acessibilidade pede.
- **[P3] Aplicativo:** o ícone da janela/instalador ainda pode usar o padrão Electron; os ícones dos provedores solicitados estão implementados.
- A autenticação com contas reais e atualização de tokens continua dependendo do login do usuário. Não é uma propriedade que este comparativo visual valida.
- A comparação completa é pequena o suficiente para ler rótulos, percentuais e ícones; não foi necessária uma segunda composição ampliada de regiões.

Não restam diferenças P0/P1/P2 abertas no escopo Windows verificado.

final result: passed
