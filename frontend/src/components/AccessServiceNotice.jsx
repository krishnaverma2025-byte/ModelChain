import { useEffect, useState } from 'react';
export default function AccessServiceNotice() {
  const [pending,setPending]=useState(0);
  useEffect(()=>{
    const changed=event=>setPending(value=>Math.max(0,value+(event.detail ? 1 : -1)));
    window.addEventListener('montai-access-service',changed);
    return ()=>window.removeEventListener('montai-access-service',changed);
  },[]);
  return pending ? <p className="access-service-notice" role="status">Connecting to MontAI access service… The free test server may be waking up. No transaction is being retried.</p> : null;
}
