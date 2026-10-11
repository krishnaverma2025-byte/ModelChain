const LIMIT = 16 * 1024;
export const validateCid = cid => {
  if (typeof cid !== 'string' || !/^[a-zA-Z0-9-]{10,160}$/.test(cid)) throw new Error('Invalid CID');
  return cid;
};
export function validateRecord(record, cid) {
  if (!record || record.cid !== validateCid(cid) ||
      !/^[a-f0-9]{64}$/.test(record.modelHash || '') ||
      !/^[a-f0-9]{64}$/.test(record.encryptedHash || '') ||
      typeof record.owner !== 'string' || !record.owner ||
      !/^[A-Za-z0-9+/]{80}$/.test(record.wrappedKey || '') ||
      ['name','description','category','fileName'].some(field => record[field] !== undefined && typeof record[field] !== 'string') ||
      Buffer.byteLength(JSON.stringify(record)) > LIMIT) throw new Error('Invalid protected record');
  return record;
}
async function boundedJson(response) {
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > LIMIT) throw new Error('Protected record exceeds size limit');
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export function createRecordStore({url, serviceRoleKey, bucket, chainId, contractAddress, fetchImpl = fetch}) {
  if (!url || !serviceRoleKey || !bucket) throw new Error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_RECORD_BUCKET');
  const origin = new URL(url);
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash || !/^\/?$/.test(origin.pathname)) throw new Error('SUPABASE_URL must be an HTTPS project origin');
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(bucket) || !/^(31337|11155111)$/.test(String(chainId)) || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress || '')) throw new Error('Invalid record bucket/network namespace');
  const root = `${origin.origin}/storage/v1`;
  const headers = {apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`};
  async function request(path, options = {}) {
    let response;
    try { response = await fetchImpl(`${root}/${path}`, {...options, headers:{...headers,...options.headers}, signal:AbortSignal.timeout(30000), redirect:'error'}); }
    catch { throw new Error('Protected record store unavailable'); }
    if (!response.ok) throw new Error(`Protected record store request failed (HTTP ${response.status})`);
    return response;
  }
  const key = cid => `${bucket}/${chainId}/${contractAddress.toLowerCase()}/${validateCid(cid)}.json`;
  async function verifyPrivate() {
    const info = await boundedJson(await request(`bucket/${bucket}`));
    if (info.id !== bucket || info.public !== false) throw new Error('Protected record bucket must exist and be PRIVATE');
  }
  return {
    verifyPrivate,
    async save(record) {
      validateRecord(record, record.cid);
      await verifyPrivate();
      await request(`object/${key(record.cid)}`, {method:'POST', headers:{'Content-Type':'application/json','x-upsert':'false','Cache-Control':'no-store'}, body:JSON.stringify(record)});
    },
    async record(cid) {
      await verifyPrivate();
      return validateRecord(await boundedJson(await request(`object/authenticated/${key(cid)}`, {headers:{'Cache-Control':'no-cache'}})), cid);
    }
  };
}
