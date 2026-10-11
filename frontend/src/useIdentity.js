import { useSyncExternalStore } from "react";
import { walletSession } from "./walletSession.mjs";
export default function useIdentity() {
  return useSyncExternalStore(walletSession.subscribe, walletSession.snapshot);
}
