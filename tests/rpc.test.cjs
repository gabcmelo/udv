const { test } = require('node:test');
const assert = require('node:assert/strict');
const { RpcClient } = require('../electron/process.cjs');
test('JSONL client handles handshake, interleaved notifications and pending calls on shutdown', async t => {
  const script = `const rl = require('node:readline').createInterface({input:process.stdin}); let initialized=false; rl.on('line', line => { const m=JSON.parse(line); if(m.method==='initialize'){ initialized=true; console.log(JSON.stringify({id:m.id,result:{}})); } else if(m.method==='probe'){console.log(JSON.stringify({method:'changed',params:{ok:true}})); console.log(JSON.stringify({id:m.id,result:{initialized}}));} });`;
  const notifications = []; const client = new RpcClient(process.execPath, ['-e', script], {}, (...args) => notifications.push(args)); t.after(() => client.close());
  await client.initialize(); assert.deepEqual(await client.request('probe'), { initialized: true }); assert.equal(notifications[0][0], 'changed');
  const pending = client.request('never'); client.close(); await assert.rejects(pending, /encerrado/);
});
