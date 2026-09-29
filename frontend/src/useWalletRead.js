import { useEffect, useState } from "react";
export default function useWalletRead() {
  const [address, setAddress] = useState("");
  useEffect(() => {
    let active = true,
      revision = 0;
    const ethereum = window.ethereum;
    const changed = (accounts) => {
      revision++;
      if (active) setAddress(accounts[0] || "");
    };
    const initial = revision;
    ethereum
      ?.request({ method: "eth_accounts" })
      .then((a) => {
        if (active && initial === revision) changed(a);
      })
      .catch(() => {});
    const network = () => changed([]);
    ethereum?.on("accountsChanged", changed);
    ethereum?.on("chainChanged", network);
    return () => {
      active = false;
      ethereum?.removeListener("accountsChanged", changed);
      ethereum?.removeListener("chainChanged", network);
    };
  }, []);
  return address;
}
