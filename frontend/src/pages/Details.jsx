import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ethers } from "ethers";
import { config, ABI, readContract, metadata } from "../blockchain";
import "./Details.css";
import ModelAccess, { CopyValue } from "../components/ModelAccess";

const CONTRACT_ADDRESS = config.address;
const CONTRACT_ABI = ABI;

function Details() {
  const { id } = useParams();

  const [walletRevision, setWalletRevision] = useState(0);
  useEffect(()=>{const changed=()=>setWalletRevision(n=>n+1);window.ethereum?.on("accountsChanged",changed);window.ethereum?.on("chainChanged",changed);return()=>{window.ethereum?.removeListener("accountsChanged",changed);window.ethereum?.removeListener("chainChanged",changed);};},[]);
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [licensed, setLicensed] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadModel() {
      setLoading(true);
      setError("");
      setSuccess("");
      setLicensed(false);

      try {
        if (!/^[1-9]\d*$/.test(String(id))) {
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
    };
  }, [id, walletRevision]);

  const handleLicense = async () => {
    setError("");
    setSuccess("");

    try {
      if (!window.ethereum) {
        throw new Error(
          "MetaMask is not installed."
        );
      }

      if (!model) {
        throw new Error(
          "Model information is not loaded."
        );
      }

      setPurchasing(true);

      const browserProvider =
        new ethers.BrowserProvider(
          window.ethereum
        );

      await browserProvider.send(
        "eth_requestAccounts",
        []
      );

      // Check MetaMask network
      const network =
        await browserProvider.getNetwork();

      if (network.chainId !== config.chainId) {
        throw new Error(
          `Please select network ${config.chainId} in MetaMask.`
        );
      }

      const signer =
        await browserProvider.getSigner();

      const walletAddress =
        await signer.getAddress();

      if (
        walletAddress.toLowerCase() ===
        model.creator.toLowerCase()
      ) {
        throw new Error(
          "The model owner cannot purchase their own model."
        );
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      const modelId = BigInt(model.id);

      const alreadyLicensed =
        await contract.hasLicense(
          modelId,
          walletAddress
        );

      if (alreadyLicensed) {
        setLicensed(true);

        throw new Error(
          "You already own a license for this model."
        );
      }

      setSuccess(
        "Opening MetaMask..."
      );

      const transaction =
        await contract.purchaseLicense(
          modelId,
          {
            value: model.priceWei,
          }
        );

      setSuccess(
        "Transaction submitted. Waiting for confirmation..."
      );

      await transaction.wait();

      setLicensed(true);

      setSuccess(
        "License purchased successfully! Transaction confirmed on the blockchain."
      );
    } catch (err) {
      console.error(
        "License purchase failed:",
        err
      );

      if (
        err?.code ===
        "ACTION_REJECTED"
      ) {
        setError(
          "Transaction was rejected in MetaMask."
        );
      } else if (
        err?.shortMessage
      ) {
        setError(
          err.shortMessage
        );
      } else if (err?.reason) {
        setError(
          err.reason
        );
      } else {
        setError(
          err?.message ||
            "License purchase failed."
        );
      }
    } finally {
      setPurchasing(false);
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
                disabled={purchasing || !model.active}
              >
                {purchasing
                  ? "Processing..."
                  : "License Model"}
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

          <ModelAccess id={model.id} />
          </aside>

        </div>

      </main>
    </div>
  );
}

export default Details;
