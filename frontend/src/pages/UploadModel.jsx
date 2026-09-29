import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { Badge, CopyValue, NetworkBadge } from "../components/UI";
import {
  config,
  wallet,
  assertCurrentWallet,
  authenticate,
  api,
  hashFile,
  errorText,
} from "../blockchain";

function UploadModel() {
  const navigate = useNavigate();
  const selection = useRef(0);
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
    if (loading || hashPending) return;
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
        "Enter a name, positive ETH price and a model file up to 25 MB.",
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
    setLoading(true);
    try {
      setStage("authentication");
      const { signer, address, contract } = await wallet();
      setSignerAddress(address);
      setMessage("Sign a free authentication message in MetaMask.");
      const headers = await authenticate(signer);
      const form = new FormData();
      form.append("model", modelFile);
      form.append("name", modelName.trim());
      form.append("description", description);
      form.append("category", category);
      setStage("storage");
      setMessage("Encrypting and storing your model off-chain…");
      const uploaded = await (
        await api("/api/uploads", { method: "POST", headers, body: form })
      ).json();
      if (uploaded.modelHash !== (await hashFile(modelFile)))
        throw new Error("Upload integrity mismatch.");
      setStored(uploaded);
      setStage("blockchain");
      await assertCurrentWallet(address);
      setMessage(
        uploaded.storage === "local"
          ? "Development storage: encrypted local bytes. Confirm registration in MetaMask."
          : "Encrypted IPFS upload complete. Confirm registration in MetaMask.",
      );
      const tx = await contract.registerModel(
        modelName.trim(),
        uploaded.cid,
        uploaded.modelHash,
        ethers.parseEther(price),
        Number(royalty),
      );
      setMessage("Transaction submitted. Waiting for confirmation…");
      const receipt = await tx.wait();
      if (receipt.status !== 1)
        throw new Error("Registration transaction failed.");
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
          "Registration confirmed; refresh Marketplace to find your model.",
        );
      navigate("/model/" + event.args.modelId.toString(), {
        state: {
          registration: { block: receipt.blockNumber, transaction: tx.hash },
        },
      });
    } catch (err) {
      setStage("failed");
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-page">
      <main className="upload-content">
        <p className="storage-note">
          Your model is encrypted off-chain: IPFS when configured, encrypted
          local storage in development. Blockchain stores its storage
          identifier, original SHA-256 hash, ownership and licensing
          information. Maximum file size: 25 MB.
        </p>

        <div className="section-label">LIST YOUR MODEL</div>

        <h1>Upload AI Model</h1>

        <p className="upload-description">
          Register your AI model and make it available for decentralized
          licensing.
        </p>

        <div className="upload-layout">
          <fieldset className="upload-card panel" disabled={loading}>
            <legend>01 / MODEL</legend>

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
                rows="5"
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
              <p>
                You receive this percentage of each sale; the platform receives
                the remainder.
              </p>
            </div>
            <div className="form-group">
              <label htmlFor="model-file">Model File</label>

              <div className="file-upload">
                <input
                  id="model-file"
                  type="file"
                  accept=".zip,.onnx,.pt,.pkl,.bin,.safetensors"
                  onChange={handleFileChange}
                />

                <span>{modelFile ? modelFile.name : "Select model file"}</span>
              </div>
            </div>

            {message && (
              <p
                style={{
                  color: "#4ade80",
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
                  color: "#ff6b6b",
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
              disabled={loading || hashPending}
            >
              {loading ? "Registering..." : "Register Model"}
            </button>
          </fieldset>
          <aside className="upload-stages">
            <section className="panel">
              <p className="eyebrow">02 / SECURITY</p>
              <h2>Original integrity reference</h2>
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
                SHA-256 is calculated locally. The backend encrypts the original
                before uploading it to storage.
              </p>
            </section>
            <section className="panel">
              <p className="eyebrow">03 / STORAGE</p>
              <h2>Encrypted package</h2>
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
            </section>
            <section className="panel">
              <p className="eyebrow">04 / BLOCKCHAIN</p>
              <h2>Registration</h2>
              <NetworkBadge />
              <p>Price: {price || "—"} ETH</p>
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
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default UploadModel;
