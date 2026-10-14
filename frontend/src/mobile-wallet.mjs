const canonical = 'https://montai-six.vercel.app';
export function walletHandoff({userAgent='',maxTouchPoints=0,hasProvider=false,href=canonical} = {}) {
  if(hasProvider || !(/Android|iPhone|iPad|iPod|Mobile/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints>1))) return null;
  let source;
  try { source=new URL(href); } catch { source=new URL(canonical); }
  const safe = source.protocol === 'https:' && !source.username && !source.password &&
    /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(source.hostname) && !/\.(localhost|local|internal|test|invalid)$/i.test(source.hostname);
  const target = safe ? source : new URL(canonical);
  // Path only: OAuth fragments, query tokens and other sensitive state must not
  // leave the current browser. No automatic navigation or wallet request.
  return `https://metamask.app.link/dapp/${target.host}${target.pathname}`;
}
