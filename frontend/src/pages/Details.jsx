import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ethers } from "ethers";
import {
  readContract,
  metadata,
  purchaseModelLicense,
  errorText,
} from "../blockchain";
import { Badge, CopyValue } from "../components/UI";
import {
  ProvenanceDrawer,
  ProvenanceFields,
  SessionTimeline,
} from "../components/Provenance";
import History from "../components/History";
import useWalletRead from "../useWalletRead";
import ModelAccess from "../components/ModelAccess";
import WalletGate from "../components/WalletGate";

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
    let cancelled = false;
    const controller = new AbortController();

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

        const extra = await metadata(blockchainId, {
          signal: controller.signal,
        });
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

        if (address) {
          try {
            const accounts = [address];

            if (accounts.length > 0) {
              const alreadyLicensed = await contract.hasLicense(
                blockchainId,
                accounts[0]
              );

              if (!cancelled) {
                setLicensed(alreadyLicensed);
                setLicenseKnown(true);
                setOwner(
                  accounts[0].toLowerCase() === data.owner.toLowerCase()
                );
              }
            }
          } catch (licenseError) {
            if (!cancelled) setError(errorText(licenseError));
          }
        }
      } catch (err) {
        if (!cancelled) {
          setModel(null);

          setError(
            errorText(err) ||
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
      controller.abort();
      requests.current++;
    };
  }, [id, walletRevision, address]);

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
        `License verified on-chain for ${result.address}. Transaction: ${result.transactionHash}`
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
    (e) => e.name === "ModelRegistered" && e.modelId === id
  );
  const license = owner
    ? "CREATOR"
    : !address
    ? "Not authenticated"
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
      <header
        className="page-heading details-header"
        data-category={model.category}
      >
        <div>
          <p className="eyebrow">
            {model.category} / <code>#{model.id}</code>
          </p>
          <h1>{model.name}</h1>
          <div className="details-creator">
            <span>Creator</span>
            <CopyValue value={model.creator} label="creator" compact />
          </div>
        </div>
      </header>
      <nav className="details-sections" aria-label="Model sections">
        <a href="#model-overview">Overview</a>
        <a href="#model-provenance">Provenance</a>
        <a href="#model-access">License / Access</a>
        <a href="#model-history">History</a>
      </nav>
      <div className="details-grid">
        <aside className="license-card panel">
          <div className="section-head">
            <span className="caption">Wallet-bound license</span>
            <Badge tone={model.active ? "success" : "neutral"}>
              {model.active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="license-price">
            {model.price} <span>ETH</span>
          </div>
          <p className="caption">One-time payment · Wallet-bound access</p>
          {!address && (
            <>
              <p className="eyebrow">YOUR ACCESS</p>
              <p>Sign in to check license status.</p>
              <WalletGate action="license this model" />
            </>
          )}
          {address && (
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
          )}
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
          <button
            className="secondary-button trace-button"
            onClick={() => setTrace(true)}
          >
            Trace Model
          </button>
        </aside>
        <div className="details-left">
          <section className="panel" id="model-overview">
            <p className="eyebrow">OVERVIEW</p>
            <h2>About this model</h2>
            <p>{model.description}</p>
            <div className="model-metadata-grid">
              {[
                ["Framework", "Not recorded"],
                ["File size", "Not recorded"],
                ["Version", model.version],
              ].map(([label, value]) => (
                <div key={label}>
                  <p>{label}</p>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>
          <section className="panel" id="model-provenance">
            <p className="eyebrow">PROVENANCE</p>
            <h2>Verifiable registration data</h2>
            <ProvenanceFields
              compact
              model={model}
              license={license}
              registration={registration}
              integrity={integrity}
            />
          </section>
          <section className="panel" id="model-access">
            <p className="eyebrow">License / Access</p>
            <h2>Secure model delivery</h2>
            {address ? (
              <ModelAccess key={scope} id={model.id} onEvidence={record} />
            ) : (
              <p>
                Sign in and purchase a license to securely download and verify
                this model.
              </p>
            )}
          </section>
        </div>
      </div>
      <section className="panel history-panel" id="model-history">
        <div className="section-head">
          <div>
            <p className="eyebrow">History</p>
            <h2>Protocol activity</h2>
          </div>
          <Link to="/activity">All protocol activity →</Link>
        </div>
        <History
          key={scope}
          modelId={model.id}
          refresh={licensed ? 1 : 0}
          onEvents={setEvents}
        />
        <details className="session-evidence">
          <summary>Current-session evidence</summary>
          <SessionTimeline events={evidence} />
        </details>
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
