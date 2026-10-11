import { isAddress } from 'ethers';
export function deploymentConfig(env) {
  const production = env.NODE_ENV === 'production';
  const required = ['RPC_URL','CHAIN_ID','CONTRACT_ADDRESS','CLIENT_ORIGIN','MODEL_MASTER_KEY'];
  if (production) required.push('PINATA_JWT','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_RECORD_BUCKET');
  const missing = required.filter(name => !env[name]?.trim());
  if (missing.length) throw new Error(`Missing configuration: ${missing.join(', ')}`);
  if (!isAddress(env.CONTRACT_ADDRESS) || !['31337','11155111'].includes(env.CHAIN_ID)) throw new Error('Only localhost/Sepolia with a valid contract address is supported');
  if (production && env.CHAIN_ID !== '11155111') throw new Error('Public hosting requires Sepolia testnet (11155111)');
  if (!/^[a-f0-9]{64}$/i.test(env.MODEL_MASTER_KEY)) throw new Error('MODEL_MASTER_KEY must be 64 hex characters');
  for (const name of ['RPC_URL','CLIENT_ORIGIN',...(env.IPFS_GATEWAY ? ['IPFS_GATEWAY'] : [])]) {
    let url;
    try { url = new URL(env[name]); } catch { throw new Error(`Invalid ${name}`); }
    if (url.username || url.password || (production && url.protocol !== 'https:') || !['http:','https:'].includes(url.protocol)) throw new Error(`${name} must use a valid ${production ? 'HTTPS' : 'HTTP(S)'} URL`);
    if (name === 'CLIENT_ORIGIN' && (url.pathname !== '/' || url.search || url.hash)) throw new Error('CLIENT_ORIGIN must be a single exact origin');
  }
  const port = Number(env.PORT || 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  const persistent = [env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, env.SUPABASE_RECORD_BUCKET];
  if (persistent.some(Boolean) && !persistent.every(Boolean)) throw new Error('Persistent record store configuration must be complete');
  return {production, port, host: env.HOST || (production ? '0.0.0.0' : '127.0.0.1')};
}
