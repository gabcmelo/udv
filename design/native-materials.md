# Materiais nativos: viabilidade para o UDV

Esta rodada continua sendo um estudo de UX. A aplicação e seus conectores não foram migrados.

## Direção visual

Conteúdo flat: uma lista contínua, ícones reais, controles sem relevo, separadores discretos e barras finas. Material de vidro na superfície externa, sem transformar cada conta em um cartão de vidro. O modo claro e o escuro precisam continuar legíveis; reduzir transparência deve produzir um fundo sólido.

## Windows

O material apropriado para um popup transitório é **Desktop Acrylic**: translucidez com textura sutil. **Mica** usa o wallpaper e é pensado para janelas de longa duração, como o painel secundário. Não são nomes intercambiáveis para o mesmo blur.

O Electron atual expõe `backgroundMaterial: 'acrylic'` / `setBackgroundMaterial('acrylic')`, com suporte documentado em Windows 11 22H2+. Assim é possível usar o material desenhado pelo sistema mantendo a base atual. O conteúdo React continua sendo conteúdo web: a superfície pode ser nativa sem que todos os controles sejam WinUI.

Caso o objetivo passe a ser também controles, menus, acessibilidade e comportamento integralmente nativos do Windows, uma shell **WinUI 3** é a alternativa a avaliar. Isso seria uma mudança de implementação futura, não um detalhe de CSS.

## macOS

**Vibrancy não é Liquid Glass.** O Electron documenta materiais de vibrancy, mas não oferece uma propriedade pública equivalente a `NSGlassEffectView` em sua documentação atual.

Para Liquid Glass real, o caminho oficial é **AppKit/SwiftUI**, por exemplo `NSGlassEffectView`, disponível em macOS 26+. A shell de bandeja pode usar `NSStatusItem` com um painel/popover e conteúdo nativo. Um módulo que incorpore essa view ao Electron também é uma possibilidade técnica, mas exigiria validar integração, distribuição e suporte por versão; não assumimos que exista pronto ou que vibrancy produza o mesmo efeito.

Em sistemas anteriores ou com transparência reduzida, utilizar o fallback nativo apropriado. Ainda será necessário testar num Mac real o resultado, contraste, foco e fechamento do popup.

## Protótipo desta rodada

No navegador, blur, granulação e bordas são **simulações visuais**. Não demonstram refração real do Liquid Glass nem o compositor de fundo do Windows. Os controles do estudo indicam essa diferença.

O estudo mantém a lista de contas, cenários de leitura e abertura do painel secundário já aprovados. A avaliação é de densidade, contraste, ícones e identidade de cada plataforma. A escolha da shell nativa vem depois dessa revisão.

## Janela de estudo com Acrylic real no Windows

Foi criada e aberta uma experiência isolada em `design/native-preview.cjs`, com o mesmo conteúdo fictício e `backgroundMaterial: 'acrylic'`. Não importa o código de contas ou autenticação da aplicação. A superfície é desenhada pelo Windows; os controles e o conteúdo ainda são HTML.

Para reabrir:

```sh
node scripts/start-native-study.cjs
```

Escape fecha essa janela de estudo. A captura verificada fica em `design/preview-native-windows.png`. A versão Mac deste estudo ainda não tem Liquid Glass nativo: o caminho nativo Mac precisa de uma implementação e validação próprias.

## Fontes primárias consultadas em 26/10/2026

- [Electron BaseWindow: materiais e vibrancy](https://www.electronjs.org/docs/latest/api/base-window)
- [Microsoft: Acrylic material](https://learn.microsoft.com/en-us/windows/apps/design/style/acrylic)
- [Microsoft: materiais em aplicações Windows](https://learn.microsoft.com/en-us/windows/apps/develop/ui/materials)
- [Apple: NSGlassEffectView](https://developer.apple.com/documentation/appkit/nsglasseffectview)
- [Apple: referência estruturada e disponibilidade da API](https://developer.apple.com/tutorials/data/documentation/appkit/nsglasseffectview.json)

## Origem dos ícones

- ChatGPT/OpenAI Blossom: SVGs monocromáticos originais do [pacote oficial OpenAI](https://cdn.openai.com/brand/OpenAI-Logos-2025.zip), disponibilizado na [página de marca](https://openai.com/brand/). Mantidos com cores e proporções originais, usados somente para identificar o provedor.
- Claude: ícone original referenciado pela [página oficial Claude](https://claude.com/), hospedado em `assets.claude.com`. Não foi redesenhado.

Os ícones identificam os serviços; o produto continua sendo UDV. O cartão Codex continua nomeado Codex, usando o símbolo ChatGPT/OpenAI solicitado pelo usuário.
