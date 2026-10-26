# Refinamento aprovado pelo usuário: flat e materiais do sistema

O usuário aprovou a direção do flyout compacto e pediu: “quero um padrão estético mais chapado, mais flat”, “se possível usar ferramentas nativas”, “no mac eu quero ver o liquid glass”, “no windows ... algo mais vidro, granulado”, “usar os ícones do chatgpt e do claude”.

Continue o trabalho de UX. Não altere a aplicação. O alvo é `design/tray-prototype.html`, cuja estrutura e interações devem permanecer. Leia o HTML e a imagem `design/preview-windows.png`. Use frontend-design:frontend-design novamente se necessário.

Precisamos de uma revisão visual focada, não outra proposta inteira. Retorne saída estruturada com:

- `css`: CSS adicional para inserir ao fim dos estilos existentes, aproveitando classes `.win` / `.mac`. Não retorne HTML inteiro nem JS. O coordenador instalará os ícones oficiais em `.chip img` (monocromáticos, transparência, sem tiles coloridos; preserve proporções). Não desenhe logos ou troque por abreviações.
- `proposalMarkdown`: síntese em português das mudanças, incluindo o que é simulação no navegador e o que pede suporte nativo.

Direção:

1. Superfície contínua e flat, sem cards encaixados, gradientes ornamentais, contornos exagerados, sombras repetidas, relevo nos controles ou cores pastel nos tiles. Manter contas legíveis em 380px, mesmas informações e hierarquia.
2. Windows: inspiração Fluent/Acrylic, fumaça translúcida, granulação MUITO sutil, cantos contidos, divisórias discretas. O grão é textura do material, não decoração. Tipografia Segoe UI. Controles flat e pequenos. O popup deve parecer parte do sistema.
3. Mac: inspiração Liquid Glass, borda de vidro discreta, material translúcido de alto contraste, tipografia de sistema, sem exagerar highlights, bolhas ou distorção. A UI dentro do vidro continua flat. Não é para desenhar skeuomorfismo.
4. O desktop de fundo do estudo pode usar dois ou três campos amplos de cor suaves para tornar a transparência visível, mas deve permanecer discreto e secundário. Nenhuma imagem ou download externo. Os controles do estudo ficam fora da proposta e indicam “Material simulado no navegador”.
5. Tanto tema claro quanto escuro devem ser contemplados via `.theme-light` no elemento `#screen`; default escuro. O coordenador adicionará botão de tema. Inclua regras claras para legibilidade dos textos/ícones, tracks, foco e estados nos dois temas. Não usar inversão indiscriminada dos logos.
6. Classes `.reduced-transparency` em `#screen` e `prefers-reduced-transparency: reduce`: fundos sólidos apropriados por tema, sem blur ou efeito de vidro. Reforçar contraste e respeitar reduced-motion.
7. Referências técnicas já verificadas: Electron `backgroundMaterial: 'acrylic'` aplica material real no Windows 11 22H2+; `mica` é para janelas de longa duração. No Mac, Electron documenta `vibrancy` mas isso não equivale a Liquid Glass. Liquid Glass nativo usa AppKit `NSGlassEffectView` / SwiftUI em macOS 26+. A proposta pode recomendar shell nativa Mac e shell WinUI 3 no Windows para controles realmente nativos, mas isso é decisão de implementação futura. Não prometa material nativo dentro do navegador nem reescreva o app.

Importante: a rodada é refinamento sobre a direção aprovada. Não mude o fluxo para sidebar, dashboard hero, seletor de uma conta ou menu que esconda as demais. Não invoque outras ferramentas além de leitura/Skill. Não escreva arquivos. Seja conciso: CSS focado e nota técnica de até cerca de 600 palavras.
