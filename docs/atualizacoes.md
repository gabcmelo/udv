# Versões, Releases e atualizações do app

[← Voltar ao README](../README.md)

**Status:** atualizador e pipeline implementados na 0.1.0. A primeira versão continua em desenvolvimento: assinatura, notarização e atualização entre instalações reais ainda precisam de validação nas plataformas de destino. Nenhuma tag de fechamento ou Release foi criada nesta implementação.

## Atualização no aplicativo

Em um app instalado, o UDV consulta Releases públicas de `gabcmelo/udv` cerca de 15 segundos após iniciar e a cada seis horas. Ao voltar da suspensão, faz uma consulta se o prazo venceu. Em desenvolvimento, as consultas ficam desativadas.

Somente versões estáveis superiores à instalada são aceitas. Drafts e prévias não entram no canal público. A compatibilidade de sistema e arquitetura é tratada pelo `electron-updater` e pelos metadados do builder.

Quando encontra uma atualização, o app baixa o pacote em segundo plano e mostra o progresso em **Aparência e ajuda → Atualizações do UDV**. Depois do download, oferece **Reiniciar e instalar** e um aviso que pode ser adiado com **Depois**. O adiamento é salvo por versão e compartilhado entre as duas janelas.

A instalação só começa pela ação explícita. Fechar o painel mantém o app na bandeja; sair do app também não instala automaticamente uma atualização pendente. Ao reabrir, o updater verifica novamente a versão disponível e pode reutilizar seu cache verificado.

**Verificar atualizações** está disponível nas preferências e no menu da bandeja. Consultas manuais têm intervalo mínimo de um minuto. **Atualizar limites** continua separado dessa ação.

| Estado | Comportamento |
| --- | --- |
| Desenvolvimento | Consulta desativada e explicação visível. |
| Verificando | Uma consulta por vez, sem abrir janelas automaticamente. |
| Atualizado | Confirma que não há versão mais recente. |
| Baixando | Versão de destino e progresso. |
| Pronto | Instalação explícita ou adiamento. |
| Falha | App continua utilizável, com opção de tentar novamente. |

## Organização do código

- `electron/updater.cjs`: estado, agenda, controle de concorrência, validação de versão, download e instalação.
- `electron/main.cjs`: integração com inicialização, suspensão, bandeja e IPC validado por janela/frame.
- `electron/preload.cjs`: leitura de estado, verificação e instalação; o renderizador não escolhe URLs ou caminhos de instaladores.
- `src/app-update.tsx`: progresso, ações, erros e adiamento por versão.
- `tests/updater.test.cjs`: cenários de desenvolvimento, concorrência, erros, versões rejeitadas, agenda e instalação explícita.

`electron-updater` usa o feed configurado pelo `electron-builder`. Não há token de publicação no app. Os arquivos são baixados por HTTPS e passam pela verificação de integridade do updater; as Releases de produção exigem também pacotes assinados.

A identidade `app.udv.desktop` e o diretório de dados foram preservados. Contas, credenciais e preferências permanecem fora dos arquivos substituídos pelo instalador.

## Versões

- `0.1.0`: primeira entrega, ainda em desenvolvimento.
- `v0.1.0`: tag do commit de fechamento, criada somente após a validação da entrega.
- `v0.1.1`, `v0.1.2`: correções posteriores.
- `v0.2.0`: exemplo de próxima entrega de funcionalidades.

A interface deriva a versão de `package.json` durante o build e lê `app.getVersion()` no desktop. A tag e as duas versões raiz do lockfile devem coincidir com o pacote.

Mudanças se acumulam no changelog até o fechamento; cada commit não exige uma versão nova. Tags e binários de uma versão pública não devem ser substituídos. Uma correção exige uma versão superior.

Instalações antigas sem updater precisam de uma instalação manual da primeira versão que o inclui. Builds locais anteriores numerados como `0.3.0` também exigem reinstalação manual para a linha `0.1`; downgrade automático permanece desativado.

## Pacotes e pipeline

| Destino | Distribuição inicial | Atualização |
| --- | --- | --- |
| Windows x64 | Instalador NSIS `.exe` | Instalador, `latest.yml` e blockmap. |
| macOS arm64 e x64 | DMG por arquitetura | ZIPs, DMGs, blockmaps e `latest-mac.yml` conjunto. |

O workflow [Release](../.github/workflows/release.yml) responde a tags estáveis. Ele valida versão e changelog, executa testes e build, gera Windows assinado e macOS assinado/notarizado e confere as assinaturas. Um único build macOS reúne as duas arquiteturas no manifesto.

O job final só começa quando todos os builds passaram. Ele valida a lista completa de arquivos, versões, tamanhos, referências dos manifestos e SHA-512, e prepara uma **Release em rascunho**. Apenas esse job recebe permissão para escrever no repositório.

Publicar o rascunho disponibiliza a atualização. Se um upload falhar parcialmente, o rascunho continua invisível ao updater e precisa ser revisado. Builds manuais usam `--publish never` e não enviam arquivos ao GitHub.

Veja [como configurar os certificados e fechar uma versão](lancamento.md).

## Critérios de fechamento

- [x] Versão centralizada no pacote, sem número fixo duplicado na interface.
- [x] Updater integrado ao processo principal, painel e bandeja.
- [x] Download automático e instalação somente por ação explícita.
- [x] Testes automatizados de falhas, versões inválidas, concorrência e agenda.
- [x] Workflow por tag, verificação dos pacotes e criação de rascunho conjunto.
- [ ] Configurar certificados e credenciais de notarização no GitHub Actions.
- [ ] Executar o pipeline com assinatura/notarização nas plataformas de destino.
- [ ] Validar instalação inicial no Windows e no macOS Intel/Apple Silicon.
- [ ] Validar atualização entre duas versões instaladas em um feed de teste, incluindo preservação de contas e credenciais.
- [ ] Conferir comportamento de adiamento, fechamento e falhas nas instalações reais.
- [ ] Finalizar o changelog, criar a tag e conferir a Release em rascunho.
- [ ] Publicar a Release e inserir os links reais de download no README.

## Referências

- [electron-builder 26: atualização automática](https://www.electron.build/v26/docs/features/auto-update/).
- [electron-builder 26: publicação](https://www.electron.build/v26/docs/publish/).
- [GitHub: gerenciar Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository).

A configuração acompanha o builder 26 instalado. Uma migração de major precisa rever assinatura e metadados antes de publicar.
