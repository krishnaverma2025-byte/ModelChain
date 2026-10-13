import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import assert from 'node:assert/strict';
const source = readFileSync(new URL('../src/server.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
const stages = ['configuration', 'rpc-network', 'contract-bytecode', 'production-urls', 'supabase-private-bucket', 'storage-initialization', 'server-listen'];
async function run(fail, { bucket = true, mismatch = false, missingCode = false } = {}) {
  const logs = []; let destroyed = false;
  const secret = 'PRIVATE_SENTINEL_URL_KEY_JWT_REMOTE_BODY_STACK';
  function check(stage) { if (stage === fail) throw new Error(secret); }
  const env = { RPC_URL: secret, CONTRACT_ADDRESS: '0x' + '1'.repeat(40), CHAIN_ID: '11155111', CLIENT_ORIGIN: 'https://example.test', NODE_ENV: 'production', MODEL_MASTER_KEY: secret, PINATA_JWT: secret, SUPABASE_RECORD_BUCKET: bucket ? 'private' : '' };
  class Provider {
    async getNetwork() { check('rpc-network'); return { chainId: mismatch ? 1n : 11155111n }; }
    async getCode() { check('contract-bytecode'); return missingCode ? '0x' : '0x1234'; }
    destroy() { destroyed = true; }
  }
  const process = { env };
  const context = vm.createContext({ process, URL: class extends URL { constructor(value) { check('production-urls'); super(value); } }, BigInt,
    console: { log: value => logs.push(value), error: value => logs.push(value) },
    isAddress: () => true, JsonRpcProvider: Provider, Contract: class {},
    deploymentConfig: () => { check('configuration'); return { production: true, host: '0.0.0.0', port: 4000 }; },
    createRecordStore: () => ({ verifyPrivate: async () => check('supabase-private-bucket') }),
    createStorage: () => { check('storage-initialization'); return {}; },
    createApp: () => ({ listen: (_port, _host, ready) => {
      const server = new EventEmitter();
      queueMicrotask(() => fail === 'server-listen' ? server.emit('error', new Error(secret)) : ready());
      return server;
    } })
  });
  await vm.runInContext(source, context);
  assert.ok(logs.every(line => !line.includes(secret)));
  return { logs, destroyed, exitCode: process.exitCode };
}
test('successful startup logs all checkpoints in sequence', async () => {
  const result = await run();
  assert.deepEqual(result.logs, [...stages.flatMap(stage => [`[STARTUP] CHECK: ${stage}`, `[STARTUP] OK: ${stage}`]), 'MontAI access API ready']);
  assert.equal(result.exitCode, undefined);
  assert.equal(result.destroyed, false);
});
for (const stage of stages) test(`startup failure is safely attributed to ${stage}`, async () => {
  const result = await run(stage);
  assert.equal(result.exitCode, 1);
  assert.equal(result.destroyed, stage !== 'configuration');
  assert.deepEqual(result.logs.filter(line => line.includes('FAILED:')), [`[STARTUP] FAILED: ${stage}`]);
  assert.match(result.logs.at(-1), /^MontAI startup failed\./);
  assert.ok(!result.logs.includes('MontAI access API ready'));
  assert.ok(!result.logs.includes(`[STARTUP] OK: ${stage}`));
});
test('chain mismatch and missing bytecode still fail validation', async () => {
  for (const [options, stage] of [[{ mismatch: true }, 'rpc-network'], [{ missingCode: true }, 'contract-bytecode']]) {
    const result = await run(undefined, options);
    assert.equal(result.exitCode, 1);
    assert.ok(result.logs.includes(`[STARTUP] FAILED: ${stage}`));
  }
});
test('optional record store is explicitly skipped', async () => {
  const result = await run(undefined, { bucket: false });
  assert.ok(result.logs.includes('[STARTUP] SKIPPED: supabase-private-bucket'));
});
