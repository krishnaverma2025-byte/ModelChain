import { useEffect, useRef, useState } from "react";
import {
  wallet,
  assertCurrentWallet,
  authenticate,
  api,
  hashFile,
  readContract,
  errorText,
} from "../blockchain";
export default function ModelAccess({ id, onEvidence }) {
  const [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function verify(file) {
    const contract = await readContract();
    const model = await contract.getModel(id);
    const hash = await hashFile(file);
    return hash === model.modelHash.replace(/^0x/, "").toLowerCase();
  }
  async function download() {
    setBusy(true);
    try {
      const { signer, address } = await wallet();
      setStatus("Sign in to request licensed access…");
      const headers = await authenticate(signer);
      await assertCurrentWallet(address);
      if (!active.current) return;
      onEvidence?.({
        title: "Wallet authenticated",
        layer: "OFF-CHAIN",
        detail: address,
      });
      const response = await api(`/api/models/${id}/download`, { headers });
      const blob = await response.blob();
      await assertCurrentWallet(address);
      if (!active.current) return;
      onEvidence?.({
        title: "Access authorized",
        layer: "ON-CHAIN + BACKEND",
        detail: "Protected API accepted this wallet and returned model bytes.",
      });
      if (!(await verify(blob)))
        throw new Error(
          "Model integrity verification failed. Download blocked.",
        );
      await assertCurrentWallet(address);
      if (!active.current) return;
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download =
        response.headers
          .get("Content-Disposition")
          ?.match(/filename="([^"]+)"/)?.[1] || `model-${id}.bin`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("Model integrity verified. Download ready.");
      onEvidence?.({
        title: "Model delivered",
        layer: "OFF-CHAIN",
        detail: "Verified bytes received; browser download requested.",
      });
      onEvidence?.({
        title: "Integrity verified",
        layer: "LOCAL",
        tone: "success",
        detail: "SHA-256 matches the blockchain model hash.",
      });
    } catch (e) {
      if (active.current) setStatus(errorText(e));
    } finally {
      if (active.current) setBusy(false);
    }
  }
  return (
    <section className="model-access">
      <h3>Access & verify</h3>
      <p>
        Wallet authentication and an on-chain license are checked before
        decryption.
      </p>
      <button disabled={busy} onClick={download}>
        {busy ? "Checking access…" : "Download licensed model"}
      </button>
      <label>
        Verify a local model file
        <input
          type="file"
          onChange={async (e) => {
            if (!e.target.files[0]) return;
            try {
              const match = await verify(e.target.files[0]);
              if (!active.current) return;
              setStatus(
                match
                  ? "Model integrity verified"
                  : "Model integrity verification failed",
              );
              onEvidence?.({
                title: match
                  ? "Integrity verified"
                  : "Integrity verification failed",
                layer: "LOCAL",
                tone: match ? "success" : "error",
                detail: "Local file compared with registered SHA-256.",
              });
            } catch (err) {
              setStatus(errorText(err));
            }
          }}
        />
      </label>
      <p role="status">{status}</p>
    </section>
  );
}
