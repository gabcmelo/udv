# Revisão do protótipo de anéis — 26/10/2026

Pedido: retomar Claude Code com frontend-design e explorar donuts inspirados no Apple Watch antes de alterar o aplicativo.

Retomada da sessão registrada em claude-handoff.json. O CLI confirmou a invocação de `frontend-design:frontend-design`; atividade registrada em rings-handoff.json. Briefing em brief-rings.md, proposta original em rings-claude.md, CSS e JS retornados em rings.css e rings.js.

Protótipo servido em http://127.0.0.1:4174/?variant=C. A/B/C selecionáveis na mesma página. Todos os dados são fictícios. O anel representa uso consumido, com texto de uso e saldo; nenhuma soma entre janelas.

Verificação visual no navegador integrado:

- A em Windows escuro: donuts por linha, cabeçalho e ações legíveis em 380px, lista com rolagem.
- C no cenário Extremos: três janelas independentes, 0%, 100% e janela por modelo, esgotamento indicado em texto e símbolo.
- B em macOS claro: donuts lado a lado, três janelas e contraste legível; altura maior confirmada visualmente.
- Painel no tema claro e cenário Sem leitura: anéis tracejados neutros com traço, sem percentual inventado e com a orientação atual de consulta automática do Claude.
- Cenário Atenção: leitura expirada e antiga mantêm mensagens e estados distintos, renovação não presumida.

Ajustes após receber a proposta: recalcular limites de altura do flyout após inserir os controles do estudo (evita sobreposição); corrigir dimensões dos marcadores na legenda externa.

Captura final: preview-rings.png, variante C em Windows escuro com cenário normal. O estudo usa simulação de materiais; não valida Acrylic ou Liquid Glass nativos. Não foram alterados src/, electron/, contas, credenciais ou instaladores. A baseline aprovada foi preservada em tray-prototype-flat.html. Escolha visual pendente do usuário; nenhuma variante foi promovida à aplicação.

Para reproduzir: `node design/serve-preview.cjs`. Para reaplicar os arquivos retornados ao HTML: `node scripts/apply-ux-rings.cjs`.

## Refinamento solicitado: cor por empresa

Aplicado às três variantes e ao painel: Claude em tons de laranja; Codex em tons de off-white. Cada janela mantém rótulo e tom próprio dentro da família do provedor. Alertas continuam com símbolos e texto independentes da cor da empresa. No tema claro, o off-white recebe contorno discreto para preservar sua leitura. Conferência visual no navegador em C, temas escuro e claro; captura em preview-rings-brands.png. Alteração somente no protótipo.

## Escolha do usuário

Usuário escolheu a variante C, anéis concêntricos por conta, após o refinamento das cores por empresa. Esta escolha substitui a pendência visual acima. C passa a ser o padrão do protótipo e recebe a indicação “escolhida”; A e B continuam disponíveis para comparação. Direção registrada para futura implementação: anéis compactos, legenda por janela, Claude laranja e Codex off-white, com percentuais e renovação em texto. Nenhuma mudança de produção nesta etapa.
