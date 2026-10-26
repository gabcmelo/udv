# UDV

Suas contas de IA, de relance. Veja quanto ainda pode usar no Claude e no Codex, e quando seus limites renovam. O UDV fica junto ao relógio, no Windows e no macOS. Seus dados ficam neste computador.

## Usar a versão 0.3.0

O instalador Windows é `release/UDV-0.3.0-Windows-x64.exe`. Os CLIs dos provedores precisam estar instalados no computador; Node.js não é necessário para executar o app instalado.

- Clique no ícone junto ao relógio para abrir/fechar o **resumo compacto de 380px**.
- O resumo mostra cada conta, quanto resta, quando renova e a idade da leitura. Clique na conta para expandir seus detalhes e ações.
- Anéis concêntricos mostram o **consumo** de cada janela independente: quanto mais cheio o anel, maior o uso. A legenda informa usado, saldo e renovação. Claude usa tons de laranja; Codex, off-white. A mesma visualização aparece no painel, com contraste adaptado ao tema.
- Leitura ausente ou expirada aparece com anel tracejado e “—”; leitura antiga fica atenuada. Alertas mantêm símbolos e texto. Nenhuma cota é somada entre janelas.
- **Escape** ou clique fora fecham o resumo. **Fixar** permite mantê-lo aberto; fechar pelo ícone/Escape desfaz o fixar.
- **Adicionar conta** abre o cadastro no painel. **Abrir painel** mostra uma janela maior para busca, filtros, renomeação, favoritos e remoção.
- Fechar o painel mantém o app na bandeja. Para encerrar, use **Sair do UDV** no menu contextual do ícone.
- Tema do sistema, claro, escuro e transparência reduzida ficam no painel, em **Aparência e ajuda**, e no menu da bandeja. Favoritos e preferências persistem entre execuções.
- “Explorar com dados de exemplo” ativa uma demonstração explicitamente identificada nas duas janelas. Os exemplos não são salvos como contas ou leituras reais. Saia da demonstração para conectar contas.

## Conectar contas

1. Clique em **Adicionar conta**, escolha o provedor e dê um nome ao perfil.
2. **Codex:** conclua o login ChatGPT no navegador. Conecte uma conta por vez e escolha o usuário correto. A sessão do navegador pode sugerir a conta anterior; a identidade retornada pelo CLI aparece no detalhe.
3. **Claude:** conclua `claude auth login` no terminal aberto pelo UDV. O painel passa a consultar `/usage` automaticamente, sem enviar mensagens ou precisar de “oi”. A status line continua fornecendo leituras complementares durante o uso. **Abrir Claude** volta ao mesmo perfil.
4. Repita para cada assinatura. Não há limite de contas imposto pelo app.

Os perfis são separados dos seus logins atuais. Duas entradas conectadas à mesma assinatura mostram a mesma cota; criar outro perfil não cria outra assinatura ou limite.

## Leituras e limites

- Codex: login pelo app-server oficial, identidade, plano, janelas e resets disponíveis quando informados. Consulta a cada minuto.
- Claude: executa o comando local `/usage` a cada **20 minutos**, isolado de hooks, ferramentas, MCP e persistência de sessão. A versão instalada foi verificada com zero turnos, zero tokens de inferência e custo zero. O coletor rejeita respostas com contadores de inferência diferentes de zero; nunca substitui `/usage` por mensagens de conversa.
- **Atualizar** pode antecipar a consulta de Claude após um intervalo mínimo de **1 minuto**. Erros de limitação impõem espera progressiva de 20–60 minutos; reiniciar o app não elimina essa espera. O horário da próxima consulta automática aparece nos detalhes da conta.
- A status line continua sendo uma fonte complementar. Entre as duas fontes, a leitura mais recente é exibida, preservando seu horário real.
- Janelas vêm do provedor: não se presume que toda conta tenha 5h e semana.
- A interface diferencia sem leitura, antiga (45 minutos), expirada, erro, conectando, desconectada, perto do limite e esgotada. Ausência nunca vira 0%; expiração nunca confirma renovação.
- A bandeja usa a mesma interpretação de frescor da interface. Seu badge indica problema confirmado ou dado desconhecido; o tooltip resume em texto. Cotas de assinaturas diferentes não são somadas nem calculadas em média.

## Materiais nativos

- **Windows 11 22H2+:** Acrylic nativo no popup e Mica no painel, via Electron/DWM. O conteúdo continua React; os controles não foram reescritos em WinUI.
- **macOS 26+:** integração com o módulo opcional `electron-liquid-glass`, que incorpora `NSGlassEffectView`. Somente `addView` é usado; nenhum método experimental `unstable_*`. Se indisponível, o app usa Vibrancy.
- **Acessibilidade:** transparência reduzida e alto contraste do sistema são respeitados. Existe também a preferência local de fundo sólido. O módulo de vidro não é carregado no Windows.

Windows foi compilado, executado e inspecionado nesta sessão. A implementação Mac precisa ser compilada e validada em um Mac; não há teste visual de Liquid Glass real aqui. Instaladores ainda sem assinatura/notarização.

## Executar o código

Requisitos: Node.js 22.12+ e os executáveis nativos dos CLIs desejados.

```sh
npm install
npm run dev
```

Produção local:

```sh
npm run build
npm start
```

`npm run preview` serve somente o renderizador no navegador. Conexões reais e materiais nativos exigem Electron. As referências de design estão em `design/`, separadas da aplicação.

## Testes e distribuição

```sh
npm test
npm run build
npm run test:desktop
node scripts/smoke-codex.cjs
```

O smoke desktop usa um perfil temporário e Electron real. Exercita as duas janelas, bandeja, teclado, fixar/blur, cadastro, filtros, favoritos, persistência e preferências. Não inicia login. O smoke Codex inicializa o app-server real com perfil desconectado e não chama um modelo.

```sh
npm run dist:win
# Em um Mac:
npm run dist:mac
```

Saídas em `release/`. O workflow manual `desktop-build.yml` compila Windows x64 e macOS arm64/x64 nos respectivos runners, sem publicar releases. O módulo macOS é uma dependência opcional de plataforma, empacotada fora do ASAR para carregar seu binário nativo. A indisponibilidade dela mantém o app funcional com fallback.

## Dados e credenciais

O diretório é `app.getPath('userData')` do Electron, em instalações novas, `%APPDATA%/Usage Dash View` no Windows e `~/Library/Application Support/Usage Dash View` no Mac (no desenvolvimento, `usage-dash-view`). Se houver dados de versões anteriores, inclusive da versão chamada Lumebar, o UDV continua usando a pasta existente, sem mover perfis ou credenciais. O identificador de instalação `app.udv.desktop` também é mantido para preservar a continuidade das atualizações.

- `accounts.json`: UUID, provedor, nome, favorito e criação. `preferences.json`: tema e transparência reduzida.
- Cada conta tem `profiles/<uuid>`, usado como `CODEX_HOME` ou `CLAUDE_CONFIG_DIR` do subprocesso. Variáveis herdadas de autenticação dos provedores são removidas para não selecionar outra conta por acidente.
- O Codex gerencia o próprio login. Esta versão usa o armazenamento `file` do CLI para isolar contas: o `auth.json` fica no perfil local. Não sincronize ou versione esses diretórios.
- O Claude gerencia suas credenciais de acordo com o sistema operacional. O UDV não lê tokens. A status line é configurada somente no perfil criado pelo UDV, preservando seu `~/.claude/settings.json`.
- A ponte do Claude salva somente percentuais, janelas e horário da leitura; não salva prompts, conteúdo de sessão ou tokens.
- Remover uma conta pede confirmação, encerra o login pelo CLI e apaga somente seu perfil gerenciado. Feche os terminais dessa conta antes de removê-la.
- Os CLIs continuam se comunicando com os provedores. Não há servidor UDV ou sincronização entre dispositivos.

## Limitações

- As leituras de Claude dependem do plano e da versão do CLI. `/usage` deve oferecer a resposta local compatível. A status line complementar recebe dados somente das sessões abertas com o perfil UDV, mas não é necessária para a consulta automática.
- Login real, atualização de tokens e cotas autenticadas precisam ser validados com as contas do usuário.
- A resolução de executáveis cobre PATH, `~/.local/bin`, Homebrew, `~/.npm-global/bin` e o executável Codex distribuído para Windows. No Windows é necessário `.exe` nativo, não só wrapper `.cmd`.
- Sem histórico, notificações ou inicialização automática nesta versão.
- A posição do popup é limitada à área útil do monitor. Taskbar em outros lados e monitores negativos têm testes de cálculo; ainda é recomendável validar fisicamente monitores/DPI diferentes.

## Estrutura

- `src/`: componentes React do resumo e painel, estilos flat e assets oficiais.
- `shared/usage.cjs`: estados, frescor, ordenação e resumo compartilhados com a bandeja.
- `electron/main.cjs`: bandeja, janelas, ciclo de foco e IPC limitado aos frames principais.
- `electron/popup-bounds.cjs`: cálculo de posição e limite do popup.
- `electron/materials.cjs`: Acrylic, Mica, Liquid Glass, Vibrancy e fallback sólido.
- `electron/providers.cjs`, `process.cjs`, `limits.cjs`: integração e normalização dos CLIs.
- `electron/claude-usage.cjs`: consulta local de uso, parser de fusos/renovação, cache e controle de frequência/backoff por conta.
- `electron/store.cjs`, `settings.cjs`: persistência local.
- `design-qa.md`: comparação visual e limites da validação.

## Referências

- [LimitBar](https://github.com/dancik/limitbar): inspiração de experiência; implementação própria.
- [Codex app-server](https://learn.chatgpt.com/docs/app-server).
- [Claude status line](https://code.claude.com/docs/en/statusline), [variáveis de ambiente](https://code.claude.com/docs/en/env-vars) e [CLI](https://code.claude.com/docs/en/cli-reference).
- [Electron: materiais](https://www.electronjs.org/docs/latest/api/base-window) e [nativeTheme](https://www.electronjs.org/docs/latest/api/native-theme).
- [electron-liquid-glass](https://github.com/Meridius-Labs/electron-liquid-glass), [Apple NSGlassEffectView](https://developer.apple.com/documentation/appkit/nsglasseffectview).
- Ícones originais: [OpenAI](https://openai.com/brand/) e [Claude](https://claude.com/). Servem para identificar os provedores; a marca da aplicação é UDV.
