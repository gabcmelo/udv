# Anéis concêntricos — implementação 0.3.0

Referência aprovada: variante C de tray-prototype.html, com cor por empresa. O renderer compartilha `UsageRings` entre resumo de bandeja e painel; sem seletor de variantes ou controles de estudo na aplicação.

- Um anel por janela fornecida pelo provedor. Arco representa consumo; legenda informa usado, saldo e renovação.
- Claude em laranja e Codex em off-white, com variações de tom por janela e contorno no tema claro.
- Janelas por modelo mantêm seus nomes. A geometria acomoda mais de três janelas sem raio negativo.
- Leitura expirada ou inválida não desenha um arco de consumo nem expõe percentual no medidor. Sem leitura mostra anel tracejado e traço. Contas desconectadas ou conectando continuam com seus fluxos próprios.
- Leituras antigas/erro mantêm os valores históricos identificados e atenuados. Alertas também aparecem por símbolo e texto.
- SVG decorativo; cada janela válida tem medidor acessível com consumo e saldo. Alto contraste usa cores do sistema. Os anéis não têm animação.
- Consulta e autenticação dos provedores não foram alteradas.

Validação: build TypeScript/Vite; 21 testes existentes; smoke desktop Electron com verificação adicional de direção do arco (38% consumido), saldo (62%), paletas, compartilhamento nas duas telas e ausência de medidor em conta desconectada. Resumo limitado a 380px por até 560px, com rolagem.

Captura automática: test-results/popup-implemented.png. Empacotamento Windows 0.3.0. A validação de materiais nativos em macOS continua dependendo de um Mac.

O smoke do executável empacotado passou: versão 0.3.0, resumo de 380px, componente de anéis para as contas conectadas e identidades preservadas. Instalador gerado em release/UDV-0.3.0-Windows-x64.exe. O executável atualizado foi reiniciado com os dados locais existentes e permanece na bandeja. A captura de referência desta rodada é do Electron com dados explicitamente fictícios; não se apresenta como captura das contas reais.
