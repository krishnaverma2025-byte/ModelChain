import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ethers } from "ethers";
import { readContract, metadata, purchaseModelLicense, errorText } from "../blockchain";
import "./Details.css";
import ModelAccess, { CopyValue } from "../components/ModelAccess";

function Details() {
  const { id } = useParams();

  const [walletRevision, setWalletRevision] = useState(0);
  const revision=useRef(0);
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [licensed, setLicensed] = useState(false);
  const [owner, setOwner] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  useEffect(()=>{const requests=revision;const changed=()=>{requests.current++;setLicensed(false);setOwner(false);setPurchasing(false);setSuccess('');setError('');setWalletRevision(n=>n+1);};window.ethereum?.on("accountsChanged",changed);window.ethereum?.on("chainChanged",changed);return()=>{requests.current++;window.ethereum?.removeListener("accountsChanged",changed);window.ethereum?.removeListener("chainChanged",changed);};},[]);

  useEffect(() => {
    const requests=revision;
    let cancelled = false;

    async function loadModel() {
      setLoading(true);
      setError("");
      setSuccess("");
      setLicensed(false);
      setOwner(false);

      try {
        if (!/^[1-9]\d{0,18}$/.test(String(id))) {
          throw new Error(
            "Invalid blockchain model ID."
          );
        }

        const blockchainId = BigInt(id);

        const contract = await readContract();

        const data =
          await contract.getModel(blockchainId);

        if (!data) {
          throw new Error(
            "Model not found or inactive."
          );
        }

        if (cancelled) return;

        const extra = await metadata(blockchainId);
        if (cancelled) return;
        setModel({
          id: data.id.toString(),
          name: data.name,
          category: extra.category,
          description: extra.description,
          about:
            "Ownership, licensing and the original model hash are recorded on ModelChain. Encrypted model bytes are stored off-chain; the access service checks your wallet's license before delivery. The original SHA-256 hash lets you verify the downloaded file.",
          price: ethers.formatEther(data.price),
          creator: data.owner,
          active: data.active,
          version: "Original registration",
          license: "Wallet-bound model access",
          cid: data.cid,
          modelHash: data.modelHash,
          royalty: `${data.royalty.toString()}%`,
          priceWei: data.price,
        });

        if (window.ethereum) {
          try {
            const accounts =
              await window.ethereum.request({
                method: "eth_accounts",
              });

            if (accounts.length > 0) {
              const alreadyLicensed =
                await contract.hasLicense(
                  blockchainId,
                  accounts[0]
                );

              if (!cancelled) {
                setLicensed(alreadyLicensed);
                setOwner(accounts[0].toLowerCase()===data.owner.toLowerCase());
              }
            }
          } catch (licenseError) {
            console.log(
              "Could not check existing license:",
              licenseError
            );
          }
        }
      } catch (err) {
        console.error(
          "Failed to load model:",
          err
        );

        if (!cancelled) {
          setModel(null);

          setError(
            err?.shortMessage ||
              err?.message ||
              "Could not load this model. Make sure the Hardhat node is running."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadModel();

    return () => {
      cancelled = true;
      requests.current++;
    };
  }, [id, walletRevision]);

  const handleLicense = async () => {
    const request = revision.current;
    setError(""); setSuccess(""); setPurchasing(true);
    try {
      if (!model) throw new Error("Model information is not loaded.");
      const result = await purchaseModelLicense(model.id, message => {
        if (request === revision.current) setSuccess(message);
      });
      if (request !== revision.current) return;
      setLicensed(true);
      setSuccess(`License verified on-chain for ${result.address}. Transaction: ${result.transactionHash}`);
    } catch (err) {
      if (request === revision.current) {setSuccess("");setError(errorText(err));}
    } finally {
      if (request === revision.current) setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="details-page">
        <div className="not-found">

          <h1>
            Loading Model...
          </h1>

          <p>
            Reading model information
            from the blockchain.
          </p>

        </div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="details-page">
        <div className="not-found">

          <h1>
            Model Not Found
          </h1>

          <p>
            {error ||
              "The model you are looking for does not exist."}
          </p>

          <Link
            to="/marketplace"
            className="back-button"
          >
            ← Back to Marketplace
          </Link>

        </div>
      </div>
    );
  }

  return (
    <div className="details-page">
      <main className="details-content">

        <Link
          to="/marketplace"
          className="back-link"
        >
          ← Back to Marketplace
        </Link>

        <div className="details-header">

          <div className="details-icon">
            AI
          </div>

          <div className="details-title">

            <div className="details-category">
              {model.category}
            </div>

            <h1>
              {model.name}
            </h1>

            <p>
              {model.description}
            </p>

          </div>

        </div>

        <div className="details-grid">

          <div className="details-left">

            <section className="details-card">

              <h2>
                About this model
              </h2>

              <p>
                {model.about}
              </p>

            </section>

            <section className="details-card">

              <h2>
                Model Information
              </h2>

              <div className="info-row">
                <span>
                  Model ID
                </span>

                <strong>
                  {model.id}
                </strong>
              </div>

              <div className="info-row">
                <span>
                  Creator
                </span>

                <strong>
                  <CopyValue value={model.creator} />
                </strong>
              </div>

              <div className="info-row">
                <span>
                  Version
                </span>

                <strong>
                  {model.version}
                </strong>
              </div>

              <div className="info-row">
                <span>
                  Category
                </span>

                <strong>
                  {model.category}
                </strong>
              </div>

              <div className="info-row">
                <span>
                  License
                </span>

                <strong>
                  {model.license}
                </strong>
              </div>

              <div className="info-row">
                <span>
                  Royalty
                </span>

                <strong>
                  {model.royalty} creator share
                </strong>
              </div>

              <div className="info-row">
                <span>
                  {model.cid.startsWith('local-') ? 'Local storage ID (dev)' : 'IPFS CID'}
                </span>

                <strong>
                  <CopyValue value={model.cid} />
                </strong>
              </div>

              <div className="info-row">
                <span>
                  Model Hash
                </span>

                <strong>
                  <CopyValue value={model.modelHash} />
                </strong>
              </div>

            </section>

          </div>

          <aside className="license-card">
            <p>{model.active ? "Active listing" : "Listing inactive"}</p>

            <div className="license-label">
              LICENSE PRICE
            </div>

            <div className="license-price">
              {model.price} ETH
            </div>

            <p>
              Purchase a license to use
              this AI model.
            </p>

            {licensed ? (
              <button
                className="license-button"
                disabled
              >
                ✓ License Owned
              </button>
            ) : (
              <button
                className="license-button"
                onClick={handleLicense}
                disabled={purchasing || !model.active || owner}
              >
                {purchasing
                  ? "Processing..."
                  : owner ? "You own this model" : "License Model"}
              </button>
            )}

            {success && (
              <p
                style={{
                  marginTop: "15px",
                  color: "#8f7cff",
                }}
              >
                {success}
              </p>
            )}

            {error && (
              <p
                style={{
                  marginTop: "15px",
                  color: "#ff6b6b",
                }}
              >
                {error}
              </p>
            )}

          <ModelAccess key={`${model.id}:${walletRevision}`} id={model.id} />
          </aside>

        </div>

      </main>
    </div>
  );
}

export default Details;
