const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'design');
fs.mkdirSync(path.join(out, 'references'), { recursive: true });
const reference = 'C:/Users/GABCMELO/AppData/Local/Temp/codex-clipboard-4c153697-1083-4275-a127-9451e67b732b.png';
fs.copyFileSync(reference, path.join(out, 'references', 'limitbar-original.png'));
fs.writeFileSync(path.join(out, 'empty-mcp.json'), JSON.stringify({ mcpServers: {} }));
const schema = { type: 'object', properties: { pluginUsed: { type: 'string' }, proposalMarkdown: { type: 'string' }, prototypeHtml: { type: 'string' } }, required: ['pluginUsed', 'proposalMarkdown', 'prototypeHtml'], additionalProperties: false };
const prompt = 'Acione frontend-design:frontend-design usando Skill e leia design/brief-claude.md. O usuário pediu que Claude Code revisasse o UX antes de voltarmos à aplicação. Leia também as duas imagens indicadas no briefing e os arquivos de contexto estritamente necessários. Produza os três campos da saída estruturada. Não escreva arquivos: a coordenação salvará sua proposta e seu HTML separados da aplicação. Não use outras ferramentas além de Skill, Read, Glob e Grep. Foco em flyout compacto na bandeja, como OneDrive/LimitBar, N contas Claude/Codex e painel maior secundário.';
const env = { ...process.env }; delete env.CLAUDECODE; delete env.ELECTRON_RUN_AS_NODE;
const cli = path.join(process.env.USERPROFILE, '.local', 'bin', 'claude.exe');
const child = spawn(cli, ['-p', prompt, '--name', 'UDV UX - bandeja primeiro', '--output-format', 'stream-json', '--verbose', '--json-schema', JSON.stringify(schema), '--permission-mode', 'dontAsk', '--tools', 'Read,Glob,Grep,Skill', '--allowedTools', 'Read,Glob,Grep,Skill', '--strict-mcp-config', '--mcp-config', path.join(out, 'empty-mcp.json')], { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let result; let errorText = '';
const activity = [];
const lines = createInterface({ input: child.stdout });
lines.on('line', line => {
  let message; try { message = JSON.parse(line); } catch { return; }
  if (message.type === 'assistant') {
    for (const block of message.message?.content || []) {
      if (block.type === 'tool_use') {
        const label = `${block.name}${block.name === 'Skill' ? ': ' + (block.input?.skill || '') : ''}`;
        activity.push(label); console.log('Claude UX: ' + label);
      }
    }
  }
  if (message.type === 'result') result = message;
});
child.stderr.on('data', chunk => { errorText = (errorText + chunk).slice(-3000); });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => {
  if (code !== 0 || !result || result.is_error) { console.error('Claude Code não concluiu: ' + (result?.result || errorText || `exit ${code}`)); process.exitCode = 1; return; }
  let output = result.structured_output;
  if (!output) { try { output = JSON.parse(result.result); } catch {} }
  if (!output?.proposalMarkdown || !output?.prototypeHtml) { console.error('Claude não retornou os entregáveis estruturados esperados.'); fs.writeFileSync(path.join(out, 'claude-result.json'), JSON.stringify(result, null, 2)); process.exitCode = 1; return; }
  fs.writeFileSync(path.join(out, 'ux-proposal-claude.md'), output.proposalMarkdown, 'utf8');
  fs.writeFileSync(path.join(out, 'tray-prototype.html'), output.prototypeHtml, 'utf8');
  fs.writeFileSync(path.join(out, 'claude-handoff.json'), JSON.stringify({ pluginUsed: output.pluginUsed, activity, sessionId: result.session_id, completedAt: new Date().toISOString() }, null, 2));
  console.log('Concluído: design/ux-proposal-claude.md e design/tray-prototype.html');
  console.log('Plugin: ' + output.pluginUsed);
});
