const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'design');
const schema = { type: 'object', properties: { css: { type: 'string' }, proposalMarkdown: { type: 'string' } }, required: ['css', 'proposalMarkdown'], additionalProperties: false };
const session = JSON.parse(fs.readFileSync(path.join(out, 'claude-handoff.json'), 'utf8')).sessionId;
const env = { ...process.env }; delete env.CLAUDECODE; delete env.ELECTRON_RUN_AS_NODE;
const cli = path.join(process.env.USERPROFILE, '.local', 'bin', 'claude.exe');
const child = spawn(cli, ['-p', 'O usuário aprovou o flyout e pediu refinamento flat, materiais do sistema e logos reais. Leia design/brief-refinement.md e siga o novo escopo. Retorne APENAS os campos css e proposalMarkdown do novo schema. Não gere HTML inteiro nem modifique arquivos. Continue com frontend-design.', '--resume', session, '--output-format', 'stream-json', '--verbose', '--json-schema', JSON.stringify(schema), '--permission-mode', 'dontAsk', '--tools', 'Read,Glob,Grep,Skill', '--allowedTools', 'Read,Glob,Grep,Skill', '--strict-mcp-config', '--mcp-config', path.join(out, 'empty-mcp.json')], { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let result, stderr = '';
createInterface({ input: child.stdout }).on('line', line => {
  let message; try { message = JSON.parse(line); } catch { return; }
  if (message.type === 'assistant') for (const block of message.message?.content || []) if (block.type === 'tool_use') console.log('Claude refinamento: ' + block.name);
  if (message.type === 'result') result = message;
});
child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-2000); });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => {
  if (code !== 0 || !result || result.is_error) { console.error(result?.result || stderr || `exit ${code}`); process.exitCode = 1; return; }
  let output = result.structured_output;
  if (!output) { try { output = JSON.parse(result.result); } catch {} }
  if (!output?.css || !output?.proposalMarkdown) { console.error('Refinamento sem os campos solicitados.'); process.exitCode = 1; return; }
  fs.writeFileSync(path.join(out, 'flat-materials.css'), output.css);
  fs.writeFileSync(path.join(out, 'flat-materials-claude.md'), output.proposalMarkdown);
  console.log('Concluído: CSS e proposta de refinamento em design/.');
});
