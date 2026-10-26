const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'design');
const schema = { type: 'object', properties: { css: { type: 'string' }, javascript: { type: 'string' }, proposalMarkdown: { type: 'string' } }, required: ['css', 'javascript', 'proposalMarkdown'], additionalProperties: false };
const session = JSON.parse(fs.readFileSync(path.join(out, 'claude-handoff.json'), 'utf8')).sessionId;
const env = { ...process.env }; delete env.CLAUDECODE; delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(path.join(process.env.USERPROFILE, '.local', 'bin', 'claude.exe'), ['-p', 'Retome nossa revisão UX. O usuário pediu donuts inspirados nos anéis Apple Watch, só no protótipo antes de implementar. Leia design/brief-rings.md e siga integralmente. Invoque frontend-design:frontend-design. Retorne css, javascript e proposalMarkdown no schema.', '--resume', session, '--output-format', 'stream-json', '--verbose', '--json-schema', JSON.stringify(schema), '--permission-mode', 'dontAsk', '--tools', 'Read,Glob,Grep,Skill', '--allowedTools', 'Read,Glob,Grep,Skill', '--strict-mcp-config', '--mcp-config', path.join(out, 'empty-mcp.json')], { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let result, stderr = '';
const activity = [];
createInterface({ input: child.stdout }).on('line', line => {
  let message; try { message = JSON.parse(line); } catch { return; }
  if (message.type === 'assistant') for (const block of message.message?.content || []) if (block.type === 'tool_use') { activity.push(block.name + (block.name === 'Skill' ? ': ' + block.input?.skill : '')); console.log('Claude UX: ' + activity.at(-1)); }
  if (message.type === 'result') result = message;
});
child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-2000); });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => {
  if (code !== 0 || !result || result.is_error) { console.error(result?.result || stderr || `exit ${code}`); process.exitCode = 1; return; }
  let output = result.structured_output;
  if (!output) { try { output = JSON.parse(result.result); } catch {} }
  if (!output?.css || !output?.javascript || !output?.proposalMarkdown) { console.error('Resposta incompleta'); process.exitCode = 1; return; }
  fs.writeFileSync(path.join(out, 'rings.css'), output.css);
  fs.writeFileSync(path.join(out, 'rings.js'), output.javascript);
  fs.writeFileSync(path.join(out, 'rings-claude.md'), output.proposalMarkdown);
  fs.writeFileSync(path.join(out, 'rings-handoff.json'), JSON.stringify({ sessionId: result.session_id || session, activity, completedAt: new Date().toISOString() }, null, 2));
  console.log('Estudo de anéis recebido em design/.');
});
