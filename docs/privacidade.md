# Dados e credenciais

[← Voltar ao README](../README.md)

O UDV armazena contas, preferências e perfis neste computador. Não há servidor UDV ou sincronização entre dispositivos. Os CLIs continuam se comunicando com os respectivos provedores para autenticação e consulta de limites.

## Onde os dados ficam

Em instalações novas:

| Sistema | Diretório |
| --- | --- |
| Windows | `%APPDATA%/Usage Dash View` |
| macOS | `~/Library/Application Support/Usage Dash View` |

No desenvolvimento, o nome padrão da pasta é `usage-dash-view`. Se houver dados de uma instalação anterior, inclusive da versão chamada Lumebar, o app reutiliza essa pasta para preservar os perfis e os caminhos de credenciais.

- `accounts.json`: identificador, provedor, nome, favorito e data de criação de cada conta.
- `preferences.json`: tema e preferência de transparência reduzida.
- `profiles/<uuid>/`: perfil local de cada conta, incluindo os arquivos gerenciados pelo CLI.

## Isolamento e autenticação

Cada conta recebe seu próprio `CODEX_HOME` ou `CLAUDE_CONFIG_DIR`. O app remove variáveis herdadas de autenticação dos provedores dos subprocessos para evitar o uso acidental de outra conta.

**Codex:** o CLI gerencia o login. O UDV configura o armazenamento `file` para isolar as contas; o arquivo `auth.json` fica no perfil local. Não versione nem sincronize os diretórios de perfis, pois eles podem conter credenciais.

**Claude:** o CLI gerencia suas credenciais conforme o sistema operacional; o UDV não lê os tokens. A status line é configurada apenas no perfil criado pelo app, preservando o arquivo pessoal `~/.claude/settings.json`. A ponte da status line salva percentuais, janelas e horário da leitura, sem prompts, conteúdo da sessão ou tokens.

## Consultas de uso

O Codex consulta limites pelo app-server. O Claude executa `/usage` em um processo separado, sem hooks, ferramentas, MCP ou persistência de sessão. O coletor rejeita respostas com contadores de inferência diferentes de zero e não substitui a consulta por mensagens de conversa.

No Claude, a leitura mais recente entre `/usage` e a status line é exibida com seu horário original. Após 45 minutos, uma leitura é considerada antiga; uma janela expirada não confirma renovação sem uma nova leitura.

## Remover uma conta

A remoção pede confirmação, encerra o login pelo CLI e apaga o perfil gerenciado daquela conta. Feche os terminais abertos com esse perfil antes de removê-la.

Os logins pessoais fora dos perfis do UDV permanecem separados.
