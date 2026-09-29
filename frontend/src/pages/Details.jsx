import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ethers } from "ethers";
import {
  readContract,
  metadata,
  purchaseModelLicense,
  errorText,
} from "../blockchain";
import { Badge } from "../components/UI";
import {
  ProvenanceDrawer,
  ProvenanceFields,
  SessionTimeline,
} from "../components/Provenance";
import History from "../components/History";
import useWalletRead from "../useWalletRead";
import ModelAccess from "../components/ModelAccess";

function Details() {
  const { id } = useParams();
  const address = useWalletRead();
  const [trace, setTrace] = useState(false),
    [events, setEvents] = useState([]),
    [session, setSession] = useState({ scope: "", events: [] });

  const [walletRevision, setWalletRevision] = useState(0);
  const revision = useRef(0);
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [licensed, setLicensed] = useState(false);
  const [licenseKnown, setLicenseKnown] = useState(false);
  const [owner, setOwner] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  useEffect(() => {
    const requests = revision;
    const changed = () => {
      requests.current++;
      setLicensed(false);
      setLicenseKnown(false);
      setOwner(false);
      setPurchasing(false);
      setSuccess("");
      setError("");
      setWalletRevision((n) => n + 1);
    };
    window.ethereum?.on("accountsChanged", changed);
    window.ethereum?.on("chainChanged", changed);
    return () => {
      requests.current++;
      window.ethereum?.removeListener("accountsChanged", changed);
      window.ethereum?.removeListener("chainChanged", changed);
    };
  }, []);

  useEffect(() => {
    const requests = revision;
    let cancelled = false;

    async function loadModel() {
      setLoading(true);
      setError("");
      setSuccess("");
      setLicensed(false);
      setLicenseKnown(false);
      setOwner(false);

      try {
        if (!/^[1-9]\d{0,18}$/.test(String(id))) {
          throw new Error("Invalid blockchain model ID.");
        }

        const blockchainId = BigInt(id);

        const contract = await readContract();

        const data = await contract.getModel(blockchainId);

        if (!data) {
          throw new Error("Model not found or inactive.");
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
            const accounts = await window.ethereum.request({
              method: "eth_accounts",
            });

            if (accounts.length > 0) {
              const alreadyLicensed = await contract.hasLicense(
                blockchainId,
                accounts[0],
              );

              if (!cancelled) {
                setLicensed(alreadyLicensed);
                setLicenseKnown(true);
                setOwner(
                  accounts[0].toLowerCase() === data.owner.toLowerCase(),
                );
              }
            }
          } catch (licenseError) {
            console.log("Could not check existing license:", licenseError);
          }
        }
      } catch (err) {
        console.error("Failed to load model:", err);

        if (!cancelled) {
          setModel(null);

          setError(
            err?.shortMessage ||
              err?.message ||
              "Could not load this model. Make sure the Hardhat node is running.",
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
    setError("");
    setSuccess("");
    setPurchasing(true);
    try {
      if (!model) throw new Error("Model information is not loaded.");
      const result = await purchaseModelLicense(model.id, (message) => {
        if (request === revision.current) setSuccess(message);
      });
      if (request !== revision.current) {
        // Connecting MetaMask can emit accountsChanged mid-request. Refresh the
        // currently displayed model instead of applying the old render's state.
        setWalletRevision((n) => n + 1);
        return;
      }
      setLicensed(true);
      setLicenseKnown(true);
      setSuccess(
        `License verified on-chain for ${result.address}. Transaction: ${result.transactionHash}`,
      );
    } catch (err) {
      if (request === revision.current) {
        setSuccess("");
        setError(errorText(err));
      }
    } finally {
      if (request === revision.current) setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="details-page">
        <div className="not-found">
          <h1>Loading Model...</h1>

          <p>Reading model information from the blockchain.</p>
        </div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="details-page">
        <div className="not-found">
          <h1>Model Not Found</h1>

          <p>{error || "The model you are looking for does not exist."}</p>

          <Link to="/marketplace" className="back-button">
            ← Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const scope = `${id}:${walletRevision}`;
  const evidence = session.scope === scope ? session.events : [];
  const integrity = [...evidence]
    .reverse()
    .find((e) => e.layer === "LOCAL")?.title;
  const registration = events.find(
    (e) => e.name === "ModelRegistered" && e.modelId === id,
  );
  const license = owner
    ? "CREATOR"
    : !address
      ? "Connect wallet to check"
      : !licenseKnown
        ? "License check unavailable"
        : licensed
          ? "LICENSED"
          : "UNLICENSED";
  function record(e) {
    setSession((previous) => ({
      scope,
      events: [...(previous.scope === scope ? previous.events : []), e],
    }));
  }
  return (
    <main className="page details-page">
      <Link className="back-link" to="/marketplace">
        ← Back to Marketplace
      </Link>
      <header className="page-heading details-header">
        <div>
          <p className="eyebrow">
            MODEL REGISTRY / <code>#{model.id}</code> / {model.category}
          </p>
          <h1>{model.name}</h1>
          <p>{model.description}</p>
          <div className="actions">
            <Badge tone={model.active ? "success" : "neutral"}>
              {model.active ? "ACTIVE" : "INACTIVE"}
            </Badge>
            <Badge tone={licensed ? "success" : "neutral"}>{license}</Badge>
          </div>
        </div>
        <button className="secondary-button" onClick={() => setTrace(true)}>
          Trace Model
        </button>
      </header>
      <div className="details-grid">
        <div className="details-left">
          <section className="panel">
            <p className="eyebrow">01 / ABOUT</p>
            <h2>The model, on record</h2>
            <p>{model.about}</p>
            <p className="caption">
              Creator share: {model.royalty}. Wallet-bound access; no resale or
              usage-rights enforcement.
            </p>
          </section>
          <section className="panel">
            <p className="eyebrow">02 / PROVENANCE</p>
            <h2>Verifiable references</h2>
            <ProvenanceFields
              model={model}
              license={license}
              registration={registration}
              integrity={integrity}
            />
          </section>
        </div>
        <aside className="license-card panel">
          <p className="eyebrow">03 / LICENSE</p>
          <h2>Model access</h2>
          <div className="license-price">
            {model.price} <span>ETH</span>
          </div>
          <p>
            A license is recorded for the purchasing wallet. Encrypted delivery
            is authorized independently by the backend.
          </p>
          <button
            className="primary-button license-button"
            onClick={handleLicense}
            disabled={licensed || purchasing || !model.active || owner}
          >
            {licensed
              ? "License Owned"
              : purchasing
                ? "Transaction Pending"
                : owner
                  ? "You own this model"
                  : !model.active
                    ? "Listing inactive"
                    : "License Model"}
          </button>
          {success && (
            <p className="notice" role="status">
              {success}
            </p>
          )}
          {error && (
            <p role="alert" className="error">
              <Badge tone="error">FAILED</Badge> {error}
            </p>
          )}
          <ModelAccess key={scope} id={model.id} onEvidence={record} />
        </aside>
      </div>
      <section className="panel history-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">04 / MODEL HISTORY</p>
            <h2>Trace the record</h2>
          </div>
          <Link to="/activity">All protocol activity →</Link>
        </div>
        <History
          key={scope}
          modelId={model.id}
          refresh={licensed ? 1 : 0}
          onEvents={setEvents}
        />
        <SessionTimeline events={evidence} />
      </section>
      {trace && (
        <ProvenanceDrawer
          key={scope}
          onClose={() => setTrace(false)}
          model={model}
          license={license}
          registration={registration}
          integrity={integrity}
        />
      )}
    </main>
  );
}
export default Details;
