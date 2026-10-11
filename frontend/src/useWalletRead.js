import useIdentity from "./useIdentity";
export default function useWalletRead() {
  return useIdentity().authenticated;
}
