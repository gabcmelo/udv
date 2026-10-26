# Preparar e publicar uma versão

[← Desenvolvimento](desenvolvimento.md)

O workflow [`Release`](../.github/workflows/release.yml) começa ao enviar uma tag estável `vX.Y.Z`. Ele exige builds assinados de Windows x64 e macOS arm64/x64 e só cria um rascunho depois que as três combinações estão prontas. O rascunho não oferece a atualização aos usuários.

## Configuração inicial do GitHub

Em **Settings → Secrets and variables → Actions**, configure:

| Secret | Conteúdo |
| --- | --- |
| `WINDOWS_CSC_LINK` | Certificado Windows exportado em PFX/P12, codificado em base64. |
| `WINDOWS_CSC_KEY_PASSWORD` | Senha do certificado Windows. |
| `MAC_CSC_LINK` | Certificado **Developer ID Application** e chave privada exportados em P12, codificados em base64. |
| `MAC_CSC_KEY_PASSWORD` | Senha do certificado Apple. |
| `APPLE_ID` | Apple ID com acesso à equipe de desenvolvimento. |
| `APPLE_APP_SPECIFIC_PASSWORD` | Senha específica de app para notarização. |
| `APPLE_TEAM_ID` | Identificador da equipe Apple. |

Os certificados precisam permitir assinatura em CI; certificados Windows que dependem de hardware físico ou outro serviço de assinatura exigem adaptar essa integração. Nunca adicione certificados, senhas ou tokens ao código. O token temporário de publicação é fornecido pelo GitHub e só recebe `contents: write` no job final.

A aplicação publicada consulta Releases públicas sem credenciais do usuário. O workflow manual de build continua disponível para compilações locais/de teste sem assinatura; seus artefatos não são publicados como Release.

## Fechar uma entrega

1. Passe nos testes e na validação real de atualização nas plataformas de destino.
2. Ajuste `package.json` e as duas versões raiz de `package-lock.json` para o número escolhido.
3. Finalize a seção correspondente no `CHANGELOG.md`, por exemplo `## 0.1.0 — 2026-10-26`. Remova o texto de preparação e a lista de pendências, descrevendo a entrega e sua validação. O pipeline rejeita um título marcado **Em desenvolvimento** ou uma seção sem notas.
4. Faça commit de todos os arquivos necessários, incluindo os ícones prontos em `electron/assets/`.
5. Confira localmente com `node scripts/validate-release.cjs version v0.1.0` (substitua pela versão desejada).
6. Crie a tag no commit de fechamento e envie-a ao GitHub.
7. Acompanhe o workflow **Release**. Ele executa testes, valida as assinaturas e a notarização, confere arquivos e hashes e prepara um rascunho com todos os instaladores e metadados.
8. Confira o rascunho e publique-o pelo GitHub Releases. Essa é a etapa que torna a atualização disponível para instalações existentes.

O pipeline não cria tags nem publica automaticamente o rascunho. Uma falha de Windows ou macOS impede a criação do rascunho conjunto. Se um envio ao GitHub falhar durante o upload, pode restar um rascunho incompleto; ele permanece invisível ao atualizador e deve ser revisado antes de uma nova tentativa.

Uma versão pública não deve ter seus binários ou sua tag substituídos. Corrija o problema em uma versão superior. Testes de atualização entre duas versões devem usar outro repositório/feed, sem colocar versões fictícias no canal público.

## Arquivos esperados

- Windows: instalador `.exe`, seu `.blockmap` e `latest.yml`.
- macOS: `.dmg`, `.zip` e respectivos `.blockmap` para arm64 e x64, além de um único `latest-mac.yml` com ambas as arquiteturas.

O job final recusa arquivos ausentes, vazios, inesperados, manifestos de outra versão, referências externas, pacotes sem arquitetura e divergências de tamanho ou SHA-512. Assim, a Release só é preparada quando o conjunto completo está coerente.
