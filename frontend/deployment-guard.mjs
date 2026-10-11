export function validatePublicEnvironment(publicEnv, serverEnv={}) {
  const secrets=['SEPOLIA_PRIVATE_KEY','PINATA_JWT','MODEL_MASTER_KEY','SUPABASE_SERVICE_ROLE_KEY'].map(key=>serverEnv[key]).filter(value=>value && value.length>=16);
  for (const [name,value] of Object.entries(publicEnv)) {
    if (!name.startsWith('VITE_') || typeof value !== 'string') continue;
    if (/PRIVATE_KEY|MASTER_KEY|PINATA.*JWT|SERVICE_ROLE|SECRET|SEED|MNEMONIC/i.test(name) && value) throw new Error('Server-only credentials must never be exposed as VITE_* values');
    let serviceRole=false;
    try { serviceRole=JSON.parse(Buffer.from(value.split('.')[1] || '', 'base64url').toString()).role === 'service_role'; } catch {}
    if (serviceRole || value.startsWith('sb_secret_') || secrets.some(secret=>value.includes(secret))) throw new Error('Frontend environment contains a server-only credential');
  }
}
