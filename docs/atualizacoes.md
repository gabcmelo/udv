# Versões, Releases e atualizações do app

[← Voltar ao README](../README.md)

**Status: proposta para implementação na 0.1.0.** O atualizador e o pipeline de Releases descritos aqui ainda não estão implementados. O escopo da primeira entrega inclui Windows e macOS.

## Resultado esperado

O usuário baixa um instalador pelo GitHub Releases na primeira instalação. Depois, o próprio UDV identifica uma versão mais nova, baixa a atualização em segundo plano e oferece **Reiniciar e instalar**. Contas, credenciais e preferências permanecem no lugar.

Fechar o painel continua mantendo o app na bandeja. Uma atualização pronta não deve reiniciar o app nem ser instalada ao sair sem a ação explícita do usuário.

## Versão e tag

- **Agora:** `0.1.0` em desenvolvimento, sem tag de fechamento. Os números locais anteriores `0.2.0` e `0.3.0` não representam entregas públicas do projeto.
- **Fechamento:** `v0.1.0` aponta para o commit exato da primeira entrega.
- **Correções:** `v0.1.1`, `v0.1.2` e assim por diante.
- **Próxima entrega de funcionalidades:** `v0.2.0`, quando seu escopo estiver pronto.

Uma alteração de interface ou um commit não muda a versão por si só. As mudanças se acumulam no changelog até o fechamento da entrega. Tags e arquivos de uma versão publicada não devem ser substituídos; uma correção gera uma versão nova.

O número do pacote, do lockfile, da interface e da tag deve coincidir. Antes do fechamento, eliminar a duplicação do número na interface, derivando o fallback de `package.json` durante o build. O Electron já informa a versão instalada por `app.getVersion()`.

## Experiência de atualização

Proposta de comportamento padrão:

1. Verificar cerca de 15 segundos após a inicialização de um app instalado e a cada seis horas enquanto ele estiver aberto. Ao voltar de suspensão, verificar se o intervalo já venceu.
2. Consultar somente versões publicadas do canal estável, compatíveis com sistema e arquitetura. Não oferecer drafts, prévias, a versão atual ou versões inferiores.
3. Baixar automaticamente uma atualização disponível. Mostrar a versão de destino e o progresso em **Aparência e ajuda**, sem abrir janelas por conta própria.
4. Ao concluir e validar o arquivo, mostrar **UDV X está pronto para instalar** e as ações **Reiniciar e instalar** e **Depois**.
5. **Depois** mantém a atualização disponível, sem reinstalar ao fechar o painel ou ao sair. A instalação ocorre somente pela ação explícita.
6. Oferecer **Verificar atualizações** no painel e no menu da bandeja, com resultado visível mesmo quando já estiver atualizado.

Estados que a interface precisa distinguir:

| Estado | Mensagem ou ação |
| --- | --- |
| Verificando | “Verificando atualizações…” |
| Atualizado | “Você está usando a versão mais recente.” |
| Baixando | “Baixando UDV X… 42%” |
| Pronto | “UDV X está pronto para instalar.” / “Reiniciar e instalar” |
| Falha | “Não conseguimos atualizar o UDV. Tente novamente.” / “Tentar novamente” |
| Desenvolvimento | “Atualizações do app ficam disponíveis na versão instalada.” |

Falha de rede, falta de espaço ou erro de validação não podem encerrar o app ou apagar contas. A consulta deve ter controle de concorrência e espera entre tentativas; erros automáticos ficam no painel, sem notificações repetidas. **Atualizar limites** continua uma ação separada de **Verificar atualizações**.

## Implementação proposta

Usar `electron-updater` como dependência de produção e GitHub Releases de `gabcmelo/udv` como origem. O `electron-builder` atual permanece responsável pelos instaladores e metadados. A configuração `publish` deve ser explícita, com owner e repository fixos.

Criar `electron/updater.cjs` para concentrar a integração: inicialização, agenda, estado, eventos de progresso e instalação. Configurar download automático, desabilitar instalação automática ao sair (`autoInstallOnAppQuit = false`) e manter downgrade e prévias desabilitados. A política de canal precisa ser explícita mesmo durante os testes.

O processo principal expõe somente leitura de estado, verificação e instalação por IPC. O renderizador não fornece URLs, caminhos de instaladores ou comandos. As chamadas usam a mesma validação de janela e frame já existente; popup, painel e bandeja recebem o mesmo estado.

O atualizador funciona apenas em builds instalados e empacotados. Desenvolvimento e testes comuns não consultam Releases. As versões antigas instaladas sem esse mecanismo exigem uma primeira instalação manual da versão que o inclui.

Preservar `app.udv.desktop`, a identidade do instalador e a escolha atual do diretório de dados. Builds locais com número `0.3.0` exigem reinstalação manual para a linha `0.1`; não habilitar downgrade automático para acomodá-los.

## Pacotes das duas plataformas

| Destino | Distribuição inicial | Arquivos necessários ao atualizador |
| --- | --- | --- |
| Windows x64 | Instalador NSIS `.exe` | Instalador, `latest.yml` e `.blockmap` gerados pelo builder. |
| macOS arm64 e x64 | `.dmg` por arquitetura | `.zip` de atualização por arquitetura, manifesto `latest-mac.yml` e arquivos auxiliares gerados pelo builder. |

O build atual do macOS declara apenas DMG; será necessário incluir ZIP. O fluxo de atualização no macOS exige assinatura. A entrega da 0.1 deve incluir assinatura e notarização Apple, assinatura do instalador Windows e teste em sistemas reais. Os certificados e acessos de assinatura precisam estar disponíveis no CI antes da validação final.

Gerar os dois pacotes macOS de forma coordenada e conferir que o manifesto publicado referencia os arquivos corretos de ambas as arquiteturas. Não permitir que jobs concorrentes sobrescrevam manifestos parcialmente.

O download usa HTTPS e a verificação de integridade do updater, além da assinatura de código. Tokens de publicação e certificados ficam nos secrets do CI, nunca dentro do app ou do repositório. A consulta pública de Releases não deve exigir token no computador do usuário.

## Da tag à Release

Fluxo proposto para um novo workflow de lançamento, separado do build manual:

1. Preparar versão e changelog; passar pelos critérios de fechamento.
2. Criar e enviar uma tag `vX.Y.Z` no commit escolhido.
3. O workflow confirma que tag, pacote e lockfile coincidem e que a versão segue a política de lançamento. Executa testes e build.
4. Compilar e assinar Windows x64 e macOS arm64/x64 nos runners correspondentes; notarizar o macOS. Jobs de build não publicam individualmente.
5. Um job final reúne instaladores, ZIPs, manifestos e blockmaps. Confere a lista esperada, versões e referências dos manifestos antes de anexar tudo a uma Release em rascunho.
6. Publicar o rascunho completo após a conferência dos pacotes. Só a publicação disponibiliza a atualização aos usuários.

Falha de qualquer plataforma impede a publicação da versão conjunta. O token com permissão `contents: write` é limitado ao job de publicação; o checkout e os builds não precisam dessa permissão. Usar publicação explícita para evitar uploads acidentais a partir de builds comuns.

Notas de versão explicam novidades, correções e requisitos para o usuário. A tag identifica o código; a Release reúne os binários e os metadados usados pelo atualizador.

## Critérios para fechar a 0.1

- [ ] Um único número de versão alimenta build e interface; pacote e lockfile estão alinhados.
- [ ] Workflow por tag gera um rascunho completo com Windows x64 e macOS arm64/x64.
- [ ] Instaladores assinados; macOS notarizado e validado em Mac.
- [ ] Instalação inicial funciona nos sistemas e arquiteturas de destino.
- [ ] Duas versões crescentes, instaladas a partir de um feed/repositório de teste, demonstram busca, download, reinício e instalação. O teste não oferece builds fictícios no canal público.
- [ ] Contas, credenciais, favoritos e preferências sobrevivem à atualização.
- [ ] Adiar, fechar o painel e sair do app não instalam sem solicitação.
- [ ] Modo offline, falha de download e arquivo inválido mantêm o app utilizável e permitem tentar novamente.
- [ ] Versão atual, versão inferior, draft e prévia não são oferecidos no canal estável.
- [ ] Só a publicação da Release completa expõe a versão; falha em um build não expõe uma entrega parcial.
- [ ] README apresenta links reais de download para os instaladores e explica o atualizador como recurso disponível.

## Ordem de implementação

1. **Distribuição:** configuração de publicação, ZIP macOS, assinaturas, notarização e workflow por tag com rascunho conjunto.
2. **Atualizador:** módulo no processo principal, agenda, validação, controle de instalação e persistência necessária para retomar o estado após reabrir.
3. **Interface:** status, progresso, verificação manual, adiar e reiniciar pelo painel e bandeja.
4. **Validação e fechamento:** atualização real entre duas versões, preservação de dados, documentação de download e publicação de `v0.1.0`.

## Referências técnicas

- [electron-builder 26: atualização automática](https://www.electron.build/v26/docs/features/auto-update/) — integração, NSIS, ZIP macOS e assinatura.
- [electron-builder 26: publicação](https://www.electron.build/v26/docs/publish/) — configuração do provedor e política explícita de publicação.
- [GitHub: gerenciar Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository) — tags, rascunhos e publicação de binários.

A implementação deve consultar a documentação da versão efetivamente instalada. Uma migração futura para outro major do builder exige rever as configurações de assinatura e os metadados antes de publicar.
