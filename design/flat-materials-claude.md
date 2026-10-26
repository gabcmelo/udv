# Refinamento visual: flat e materiais do sistema

Estrutura, fluxo e hierarquia do flyout aprovado seguem iguais. Mudou só a pele, num único bloco de CSS anexado ao fim dos estilos, sem alterar HTML nem JS. Não consegui renderizar o CSS: ele não foi testado visualmente nem em contraste medido.

## O que mudou

- **Superfície única e flat.** Flyout, menu, toast e aviso usam um material só. Removi o fundo do cabeçalho e do rodapé, a borda dos botões e das abas, e o tile colorido dos provedores. Resta uma sombra por popup e divisórias de 1px em baixa opacidade. O detalhe expandido é só uma leve tinta, sem card interno. A barra de uso ficou mais fina (4px).
- **Windows (Fluent/Acrylic).** Fundo escuro translúcido com blur, borda de 1px, cantos de 8px (4px nos controles) e Segoe UI. O grão é um ruído SVG embutido em data URI, com opacidade de 5%, como textura do material. Não há requisição externa. O painel grande usa o equivalente a Mica: mais opaco, com blur maior.
- **macOS (Liquid Glass).** Vidro mais transparente (blur 40px + saturação), cantos de 18px, borda clara fina e um único realce interno de 1px. Sem grão e sem bolhas ou distorção. Divisórias entre contas recuadas e sem linha no cabeçalho. Fonte de sistema.
- **Fundo do desktop.** Três campos de cor amplos e suaves, só para a transparência ser visível, diferentes por sistema e por tema, sem imagens. O aviso "Material simulado no navegador" aparece nos controles do estudo (`.ctl::after`).
- **Logos.** `.chip img` tem 20px, sem fundo e preserva proporção, sem inversão geral. O Claude mantém a cor da marca nos dois temas. Só o Codex acompanha o tema, pela variável `--codex-filter`. **Premissa:** o asset do Codex é preto. Se vier branco, inverta os dois valores (`none` no escuro, `invert(1)` no claro). Se vierem dois arquivos, troque o filtro pela escolha de arquivo por tema.

## Temas e legibilidade

- Tudo passa por tokens em `.screen`, e `#screen.theme-light` troca o tema, sem inverter nada. No claro, âmbar e vermelho escurecem (#8a5a00, #b3261e) para texto legível e o azul de ação vira #0b5cad.
- Track, preenchimento, hachura de "não confirmado" e foco têm valores por tema. O foco continua um anel de 2px. Nas linhas da lista ele fica dentro da borda para não ser cortado.
- Estado nunca depende só de cor. Mantive formas, texto e traço tracejado, e a leitura expirada segue com "—", nunca 0%.
- Mac claro e escuro dependem do fundo atrás. Alphas de partida: 60% e 62%. Falta medir o contraste do texto secundário sobre os campos mais claros do fundo.

## Transparência e movimento

`#screen.reduced-transparency` e `@media (prefers-reduced-transparency: reduce)` trocam o vidro por fundo sólido do tema, sem blur nem grão. Reforçam também o texto secundário e as bordas. `prefers-reduced-motion` remove as transições do flyout, da expansão e do toast.

## Simulação no navegador x nativo

Isto é só aproximação visual. Navegador não entrega o material real do sistema.

- **Windows:** o Electron aplica Acrylic real com `backgroundMaterial: 'acrylic'` em Windows 11 22H2+. Ele vale para o flyout, que é efêmero. O painel grande, de vida longa, deve usar `mica`. O grão do protótipo imita a textura, e o material do sistema substitui isso na implementação. Para controles realmente nativos (menu, foco, comportamento de bandeja), a opção seria uma shell WinUI 3, mas isso é decisão futura.
- **macOS:** o `vibrancy` do Electron não é Liquid Glass. O vidro real exige macOS 26+ com `NSGlassEffectView` ou SwiftUI, isto é, uma shell nativa de Mac. Sem isso, o fallback é vibrancy e um visual mais opaco.
- **Fallbacks necessários:** Windows 10 e macOS anteriores ao 26 ficam sem material. Eles usam a cor sólida (`--solid`), como no modo de transparência reduzida.
- **Fora do navegador:** acompanhar o tema e a transparência reduzida do sistema, e o tema escolhido pela pessoa quando houver opção.

## Para a revisão visual

1. As contas continuam legíveis em 380px com o texto de 12px sobre o vidro, em escuro e claro?
2. O grão no Windows é perceptível só de perto? Se aparecer de longe, reduza `opacity` de .05 para .03.
3. O Codex tem contraste suficiente nos dois temas com a premissa do asset preto?
4. O Mac claro ficou legível sobre o campo mais claro do fundo?
