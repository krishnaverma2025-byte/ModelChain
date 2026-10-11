// Notify presentation only; never retry transactions or change wallet identity.
export async function accessFetch(url, options, fetchImpl=fetch, notify=()=>{}) {
  let slow=false;
  const timer=setTimeout(()=>{slow=true;notify(true);},1500);
  try {
    return await fetchImpl(url,{...options, signal:options?.signal || AbortSignal.timeout(90000)});
  } finally { clearTimeout(timer); if(slow) notify(false); }
}
