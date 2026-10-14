// In-flight reads only: no durable cache of auth, licenses or chain state.
export function createReadPool() {
  const pending = new Map();
  return function read(key, load, signal) {
    if (signal?.aborted) return Promise.reject(new DOMException('Request cancelled','AbortError'));
    let entry = pending.get(key);
    if (!entry) {
      const controller = new AbortController();
      entry = {controller,users:0,timer:null};
      entry.promise = Promise.resolve().then(()=>load(controller.signal)).finally(()=>{if(pending.get(key)===entry) pending.delete(key);});
      pending.set(key,entry);
    }
    clearTimeout(entry.timer);
    entry.users++;
    return new Promise((resolve,reject)=>{
      let done=false;
      const finish = (fn,value) => {
        if(done) return;
        done=true;
        signal?.removeEventListener('abort',cancel);
        entry.users--;
        // React StrictMode's immediate cleanup/remount can reuse the same read.
        if(!entry.users) entry.timer=setTimeout(()=>{
          if(!entry.users && pending.get(key)===entry) {pending.delete(key);entry.controller.abort();}
        },50);
        fn(value);
      };
      const cancel=()=>finish(reject,new DOMException('Request cancelled','AbortError'));
      signal?.addEventListener('abort',cancel,{once:true});
      entry.promise.then(value=>finish(resolve,value),error=>finish(reject,error));
    });
  };
}
export const apiReads = createReadPool();
export const chainReads = createReadPool();

export function apiError(status) {
  if(status===429) return 'Too many requests. Wait a moment before trying again.';
  if(status===401) return 'Your wallet session expired. Sign in again.';
  return null;
}
