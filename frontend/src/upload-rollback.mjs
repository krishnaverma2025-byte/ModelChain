const hashFrom = value => value?.hash || value?.transactionHash;
export function shouldCleanupUpload({transaction,receipt,error,sendStarted=false}) {
  const mined = receipt || error?.receipt;
  if(mined?.status === 1) return false;
  if(mined?.status === 0) return true;
  if(hashFrom(transaction) || hashFrom(error?.transaction) || hashFrom(error) || hashFrom(mined)) return false;
  // An RPC timeout may have broadcast a transaction without returning its hash.
  if(sendStarted && ['NETWORK_ERROR','TIMEOUT','SERVER_ERROR','UNKNOWN_ERROR'].includes(error?.code)) return false;
  return true;
}
export async function rollbackUpload(context,cleanup) {
  if(!context.cid || !shouldCleanupUpload(context)) return {attempted:false};
  try { await cleanup(context.cid); return {attempted:true,removed:true}; }
  catch {
    console.warn('[UPLOAD CLEANUP] compensation could not complete; manual review may be required');
    return {attempted:true,removed:false,message:'Registration was not confirmed. Upload cleanup could not be completed; manual review may be needed. No automatic retry was made.'};
  }
}
