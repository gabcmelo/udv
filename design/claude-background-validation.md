# UDV 0.2.1 — leitura de Claude sem mensagens

## Causa da limitação anterior

A versão 0.2.0 consultava autenticação e só relia o arquivo escrito pela status line. O “oi” ao Haiku funcionava porque provocava uma resposta e, portanto, uma nova amostra. Isso não atende a monitoramento independente de conversas.

## Mudança

O coletor agora executa exclusivamente o comando local `/usage`, isolado de hooks, MCP, ferramentas e persistência de sessão. A autenticação continua com o CLI; o UDV não abre o arquivo de credenciais. A status line continua como fonte complementar e o painel seleciona a amostra mais recente preservando o horário verdadeiro.

Intervalo automático: 20 minutos. Atualização manual: mínimo de um minuto. Limitação do endpoint: espera progressiva de 20–60 minutos; persistida entre reinicializações. O último dado é preservado quando a consulta falha ou o CLI retorna barras “last-known”.

O retorno deve ter zero turnos, zero duração de API, zero custo, zero tokens de entrada/saída/cache e nenhuma entrada em `modelUsage`. Retorno incompatível é rejeitado; nunca se usa uma mensagem de conversa como alternativa.

## Evidência real

`node scripts/probe-claude-usage.cjs` executou o comando na versão instalada e retornou:

- `num_turns: 0`, `duration_api_ms: 0`, `total_cost_usd: 0`;
- tokens de entrada, saída, leitura e criação de cache iguais a zero;
- limites de sessão, semana geral e semana por modelo.

`node scripts/verify-claude-background.cjs` percorreu o conector real usando o perfil já conectado no UDV. Resultado: `connected`, fonte `usage`, três janelas normalizadas e horário da próxima consulta. Não foi iniciado login ou enviada mensagem de conversa.

## Testes

21 testes passaram, incluindo seis casos novos: resposta local real, fusos e virada de ano, rejeição de inferência/last-known, primeira leitura sem status line, cooldown persistente, backoff e preferência pela amostra mais nova. Build e smoke de integração Electron passaram. Contas e preferências da interface foram preservadas.

## Fontes

- [Claude Code: /usage](https://code.claude.com/docs/en/commands)
- [Claude Code: falha e limitação na consulta de uso](https://code.claude.com/docs/en/costs#when-the-usage-request-fails)
- [LimitBar: consulta pelo CLI oficial](https://github.com/dancik/limitbar)

Sem garantia de estabilidade do formato textual do CLI: uma mudança de formato será tratada como erro, preservando a última leitura. A validação real desta alteração foi realizada em Windows.
