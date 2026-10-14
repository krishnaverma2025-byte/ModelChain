import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { Badge, CopyValue, NetworkBadge, Icon } from "../components/UI";
import {
  config,
  wallet,
  assertCurrentWallet,
  api,
  hashFile,
  errorText,
} from "../blockchain";
import useIdentity from "../useIdentity";
import WalletGate from "../components/WalletGate";
import { rollbackUpload } from "../upload-rollback.mjs";

function UploadModel() {
  const identity = useIdentity();
  const navigate = useNavigate();
  const selection = useRef(0);
  const operation = useRef(false);
  const registration = useRef(null);
  const uncertain = useRef(false);
  const [fileHash, setFileHash] = useState(""),
    [hashPending, setHashPending] = useState(false),
    [stored, setStored] = useState(null),
    [stage, setStage] = useState("idle"),
    [signerAddress, setSignerAddress] = useState("");

  const [royalty, setRoyalty] = useState("95");
  const [modelName, setModelName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Computer Vision");
  const [price, setPrice] = useState("0.05");
  const [modelFile, setModelFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleFileChange = async (e) => {
    const file = e.target.files[0] || null,
      request = ++selection.current;
    setModelFile(file);
    setFileHash("");
    setStored(null);
    setStage("idle");
    setError("");
    if (!file) {
      setHashPending(false);
      return;
    }
    setHashPending(true);
    try {
      const hash = await hashFile(file);
      if (request === selection.current) setFileHash(hash);
    } catch {
      if (request === selection.current)
        setError("Could not hash the selected file.");
    } finally {
      if (request === selection.current) setHashPending(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (operation.current || loading || hashPending) return;
    if (uncertain.current) {
      setError(
        "The previous registration has an unknown broadcast outcome. Check the wallet transaction history before starting another registration. Its upload was not deleted."
      );
      return;
    }
    setError("");
    setMessage("");
    if (
      !modelName.trim() ||
      modelName.length > 160 ||
      !modelFile ||
      !/^\d+(\.\d{1,18})?$/.test(price) ||
      ethers.parseEther(price) <= 0n ||
      modelFile.size > 25 * 1024 * 1024
    ) {
      setError(
        "Enter a name, positive ETH price and a model file up to 25 MB."
      );
      return;
    }
    if (
      !Number.isInteger(Number(royalty)) ||
      Number(royalty) < 0 ||
      Number(royalty) > 100
    ) {
      setError("Creator share must be a whole percentage from 0 to 100.");
      return;
    }
    operation.current = true;
    setLoading(true);
    let pendingUpload,
      uploadHeaders,
      transaction = registration.current,
      receipt,
      sendStarted = false;
    try {
      setStage("authentication");
      const { address, contract, headers } = await wallet();
      uploadHeaders = headers;
      setSignerAddress(address);
      setMessage("Wallet authenticated. Preparing encrypted storage…");
      const form = new FormData();
      form.append("model", modelFile);
      form.append("name", modelName.trim());
      form.append("description", description);
      form.append("category", category);
      setStage("storage");
      setMessage("Encrypting and storing your model off-chain…");
      const uploadKey = JSON.stringify([
        address.toLowerCase(),
        modelName.trim(),
        description,
        category,
        fileHash,
      ]);
      if (registration.current && stored?.uploadKey !== uploadKey)
        throw new Error(
          "A registration is already submitted. Check Marketplace before starting another model registration."
        );
      const uploaded =
        stored?.uploadKey === uploadKey
          ? stored
          : await (
              await api("/api/uploads", { method: "POST", headers, body: form })
            ).json();
      pendingUpload = uploaded;
      if (uploaded.modelHash !== (await hashFile(modelFile)))
        throw new Error("Upload integrity mismatch.");
      setStored({ ...uploaded, uploadKey });
      setStage("blockchain");
      await assertCurrentWallet(address);
      setMessage(
        uploaded.storage === "local"
          ? "Development storage: encrypted local bytes. Confirm registration in MetaMask."
          : "Encrypted IPFS upload complete. Confirm registration in MetaMask."
      );
      sendStarted = true;
      const tx =
        registration.current ||
        (await contract.registerModel(
          modelName.trim(),
          uploaded.cid,
          uploaded.modelHash,
          ethers.parseEther(price),
          Number(royalty)
        ));
      registration.current = tx;
      transaction = tx;
      setMessage("Transaction submitted. Waiting for confirmation…");
      receipt = await tx.wait();
      if (receipt.status !== 1) {
        registration.current = null;
        throw new Error("Registration transaction failed.");
      }
      await assertCurrentWallet(address);
      setStage("confirmed");
      const event = receipt.logs
        .map((log) => {
          try {
            return contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((log) => log?.name === "ModelRegistered");
      if (!event)
        throw new Error(
          "Registration confirmed; refresh Marketplace to find your model."
        );
      navigate("/model/" + event.args.modelId.toString(), {
        state: {
          registration: { block: receipt.blockNumber, transaction: tx.hash },
        },
      });
    } catch (err) {
      const rollback = await rollbackUpload(
        {
          cid: pendingUpload?.cid,
          transaction,
          receipt,
          error: err,
          sendStarted,
        },
        (cid) =>
          api(`/api/uploads/${encodeURIComponent(cid)}`, {
            method: "DELETE",
            headers: uploadHeaders,
          })
      );
      // Even a failed compensation may already have unpinned ciphertext. Never
      // reuse that CID for a later registration; an explicit retry uploads anew.
      if (rollback.attempted) {
        setStored(null);
        registration.current = null;
      }
      if (pendingUpload && !rollback.attempted && !transaction && !receipt)
        uncertain.current = true;
      // A mined failure must never be reused as a pending registration on retry.
      if (receipt?.status === 0 || err.receipt?.status === 0)
        registration.current = null;
      setStage("failed");
      setError(
        [
          errorText(err),
          rollback.message,
          !rollback.attempted && pendingUpload
            ? "Upload retained because registration may be pending or confirmed. Check its transaction before starting another registration."
            : "",
        ]
          .filter(Boolean)
          .join(" ")
      );
    } finally {
      operation.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="upload-page">
      <main className="upload-content">
        <div className="section-label">CREATOR STUDIO</div>

        <h1>Register a model</h1>

        <p className="upload-description">
          Encrypt your model, pin it off-chain, and register its provenance on{" "}
          {config.chainId === 11155111n ? "Sepolia" : "your local chain"}.
        </p>

        <div className="upload-layout">
          <fieldset className="upload-card panel" disabled={loading}>
            <WalletGate action="register a model" />

            <div className="form-group">
              <label htmlFor="model-name">Model Name</label>

              <input
                type="text"
                id="model-name"
                placeholder="Enter model name"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="model-description">Description</label>

              <textarea
                id="model-description"
                placeholder="Describe your AI model"
                rows="4"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="model-category">Category</label>

                <select
                  id="model-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option>Computer Vision</option>
                  <option>Natural Language</option>
                  <option>Predictive AI</option>
                  <option>Generative AI</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="model-price">License Price (ETH)</label>

                <input
                  type="number"
                  id="model-price"
                  placeholder="0.05"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="royalty">Creator share (%)</label>
              <input
                id="royalty"
                type="number"
                min="0"
                max="100"
                step="1"
                value={royalty}
                onChange={(e) => setRoyalty(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="model-file">Model File</label>

              <div className="file-upload">
                <Icon name="upload" />
                <strong>Select model source</strong>
                <span>
                  .zip, .onnx, .pt, .pkl, .bin, .safetensors · Up to 25 MB
                </span>
                <input
                  id="model-file"
                  type="file"
                  accept=".zip,.onnx,.pt,.pkl,.bin,.safetensors"
                  onChange={handleFileChange}
                />

                {modelFile && <span>{modelFile.name}</span>}
              </div>
            </div>

            {message && (
              <p
                style={{
                  color: "#0E7C61",
                  marginTop: "15px",
                  textAlign: "center",
                }}
              >
                {message}
              </p>
            )}

            {error && (
              <p
                style={{
                  color: "#C53030",
                  marginTop: "15px",
                  textAlign: "center",
                }}
              >
                {error}
              </p>
            )}

            <button
              className="upload-button"
              onClick={handleRegister}
              disabled={loading || hashPending || !identity.authenticated}
            >
              {loading ? "Registering..." : "Register Model"}
            </button>
          </fieldset>
          <aside className="upload-stages">
            <p className="eyebrow">Registration flow</p>
            <section className="registration-step">
              <code>1</code>
              <div>
                <h2>Model</h2>
                <p>Validate metadata and file</p>
              </div>
            </section>
            <section className="panel">
              <code className="step-number">2</code>
              <h2>Security</h2>
              <p>Hash and AES encrypt</p>
              <details>
                <summary>Hash & file status</summary>
                <Badge
                  tone={
                    fileHash ? "success" : hashPending ? "warning" : "neutral"
                  }
                >
                  {fileHash
                    ? "HASH CALCULATED"
                    : hashPending
                    ? "PENDING"
                    : "SELECT A FILE"}
                </Badge>
                <p>{modelFile?.name || "No model selected"}</p>
                <CopyValue value={fileHash} label="original SHA-256" />
                <p className="caption">
                  SHA-256 is calculated locally. The backend encrypts the
                  original before uploading it to storage.
                </p>
              </details>
            </section>
            <section className="panel">
              <code className="step-number">3</code>
              <h2>Storage</h2>
              <p>Pin encrypted file to IPFS</p>
              <details>
                <summary>Storage status</summary>
                <Badge
                  tone={
                    stored
                      ? "success"
                      : stage === "storage"
                      ? "warning"
                      : "neutral"
                  }
                >
                  {stored
                    ? "STORED"
                    : stage === "storage"
                    ? "PENDING"
                    : "NOT STARTED"}
                </Badge>
                <p>
                  {stored
                    ? stored.storage === "ipfs"
                      ? "Encrypted IPFS upload complete."
                      : "Encrypted local development storage."
                    : "Encryption and storage start after wallet authentication."}
                </p>
                <CopyValue value={stored?.cid} label="storage CID" />
              </details>
            </section>
            <section className="panel">
              <code className="step-number">4</code>
              <h2>Blockchain</h2>
              <p>Confirm registration in MetaMask</p>
              <details>
                <summary>Transaction details</summary>
                <NetworkBadge />
                <p>Price: {price || "—"} ETH</p>
                <p className="caption">
                  Creator receives: {royalty}% · Platform receives:{" "}
                  {100 - Number(royalty)}%.
                </p>
                <CopyValue value={signerAddress} label="registration wallet" />
                <CopyValue value={config.address} label="contract" />
                <Badge
                  tone={
                    stage === "failed"
                      ? "error"
                      : stage === "blockchain"
                      ? "warning"
                      : "neutral"
                  }
                >
                  {stage === "failed"
                    ? "FAILED"
                    : stage === "blockchain"
                    ? "PENDING"
                    : "AWAITING REGISTRATION"}
                </Badge>
                <p className="caption">
                  One upload, one registration transaction. The mined model page
                  shows its block and transaction from contract logs.
                </p>
              </details>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default UploadModel;
