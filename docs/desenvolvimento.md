# Desenvolvimento

[← Voltar ao README](../README.md)

O UDV usa Electron, React, TypeScript e Vite. As integrações com Claude e Codex executam os CLIs locais em perfis separados por conta.

## Ambiente local

Requisitos: Node.js 22.12+, npm e os executáveis nativos dos CLIs que você pretende usar. No Windows, é necessário um `.exe` nativo; somente um wrapper `.cmd` não basta.

```sh
npm ci
npm run dev
```

Para executar o build de produção localmente:

```sh
npm run build
npm start
```

`npm run preview` serve apenas a interface no navegador. Autenticação, bandeja e materiais nativos exigem Electron.

## Verificação

```sh
npm test
npm run build
npm run test:desktop
npm run test:updater
node scripts/smoke-codex.cjs
```

- `npm test` cobre integrações, isolamento de perfis, persistência, limites, estados de leitura e posição do resumo.
- `npm run build` verifica TypeScript e gera o renderizador com Vite.
- `npm run test:desktop` usa Electron real e um perfil temporário para exercitar as janelas, bandeja, teclado, filtros, favoritos e preferências, sem iniciar login.
- O smoke de Codex inicializa o app-server com um perfil desconectado, sem chamar um modelo. Exige o CLI instalado.
- `npm run test:updater`, no Windows, usa Electron e o updater NSIS reais com um servidor local e arquivos fictícios. Verifica download, SHA-512 inválido e falha de rede, sem instalar nada. O teste não valida assinatura nem atualização entre versões instaladas.

Login, renovação de tokens e cotas autenticadas precisam de validação com contas reais. Os testes de posição cobrem cálculos para múltiplos monitores; a validação física de DPI e disposição dos monitores continua necessária.

## Gerar instaladores

O ícone oficial é o **Órbita**. Os arquivos prontos ficam em `electron/assets/`: ICO para Windows, ICNS para macOS e PNGs para as janelas e a bandeja, incluindo temas, alertas e resoluções de tela. Os SVGs originais também ficam nessa pasta; o favicon usa diretamente `icon.svg`. Os formatos nativos são versionados e usados sem geração automática ao executar ou compilar o app. Se a marca mudar, atualize esses arquivos junto com os SVGs.

```sh
npm run dist:win
```

Em um Mac:

```sh
npm run dist:mac
```

Os arquivos são gerados em `release/`. O app instalado não precisa de Node.js, mas continua dependendo dos CLIs dos provedores. Os instaladores ainda não têm assinatura ou notarização.

O workflow [Desktop builds](../.github/workflows/desktop-build.yml) é manual e salva artefatos de Windows/macOS sem publicar. O workflow [Release](../.github/workflows/release.yml) responde a tags, exige assinatura/notarização e prepara uma Release em rascunho somente após validar os pacotes das duas plataformas. A [rotina de lançamento](lancamento.md) descreve os secrets necessários e a conferência final.

Builds locais usam `--publish never`: geram arquivos sem enviá-los ao GitHub. O manifesto e a configuração do feed são gerados pelo builder; o app consulta Releases públicas sem token. Em desenvolvimento, o atualizador fica desativado.

## Versão em desenvolvimento

A primeira entrega é a **0.1.0**, ainda em preparação. A interface deriva sua versão de `package.json` durante o build e usa `app.getVersion()` no desktop. O lockfile e a tag de lançamento precisam coincidir com o pacote. Uma mudança de código não exige mudar a versão.

A tag `v0.1.0` identifica o commit de fechamento. Correções posteriores recebem versões como `0.1.1`; uma próxima entrega de funcionalidades pode ser `0.2.0`. O [changelog](../CHANGELOG.md) concentra as mudanças destinadas aos usuários.

## Materiais e plataformas

No Windows 11 22H2+, o resumo usa Acrylic e o painel usa Mica.

No macOS 26+, o módulo opcional `electron-liquid-glass` usa `NSGlassEffectView`, com fallback para Vibrancy. Seu binário é empacotado fora do ASAR e não é carregado no Windows. A integração macOS ainda precisa de build e validação visual em um Mac.

Transparência reduzida e alto contraste do sistema são respeitados. A preferência local de reduzir transparência também permite usar fundo sólido.

## Mapa do código

| Caminho | Responsabilidade |
| --- | --- |
| [`src/`](../src/) | Interface React do resumo e do painel, estilos e ícones. |
| [`shared/usage.cjs`](../shared/usage.cjs) | Estados, frescor, ordenação e resumo compartilhados com a bandeja. |
| [`electron/main.cjs`](../electron/main.cjs) | Bandeja, janelas, foco e IPC. |
| [`electron/popup-bounds.cjs`](../electron/popup-bounds.cjs) | Posição do resumo e limites da área útil do monitor. |
| [`electron/materials.cjs`](../electron/materials.cjs) | Materiais nativos e fallback sólido. |
| [`electron/providers.cjs`](../electron/providers.cjs), [`process.cjs`](../electron/process.cjs), [`limits.cjs`](../electron/limits.cjs) | Integração com os CLIs e normalização dos limites. |
| [`electron/claude-usage.cjs`](../electron/claude-usage.cjs) | Consulta local, interpretação de renovação, cache e controle de frequência. |
| [`electron/store.cjs`](../electron/store.cjs), [`settings.cjs`](../electron/settings.cjs), [`data-directory.cjs`](../electron/data-directory.cjs) | Contas, preferências e localização dos dados. |
| [`tests/`](../tests/) | Testes automatizados. |

Os estudos e registros históricos de design ficam em [`design/`](../design/) e [`design-qa.md`](../design-qa.md). Eles documentam etapas anteriores e não substituem a validação da versão atual.
