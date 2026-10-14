import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { formatEther } from "ethers";
import {
  readContract,
  wallet,
  assertCurrentWallet,
  metadata,
  short,
  errorText,
} from "../blockchain";
import { NetworkBadge } from "../components/UI";
import useIdentity from "../useIdentity";
import WalletGate from "../components/WalletGate";

export default function Dashboard() {
  const identity = useIdentity();
  const revision = useRef(0);
  const loadController = useRef(null);
  const [address, setAddress] = useState(""),
    [models, setModels] = useState([]),
    [licenses, setLicenses] = useState([]),
    [revenue, setRevenue] = useState("0"),
    [status, setStatus] = useState(
      "Connect your wallet to view your models and licenses.",
    ),
    [busy, setBusy] = useState(false);
  async function load(account) {
    loadController.current?.abort();
    const controller=new AbortController();
    loadController.current=controller;
    const request = ++revision.current;
    setBusy(true);
    try {
      const c = await readContract();
      const count = await c.getModelCount();
      const mine = [],
        owned = [];
      for (let id = 1n; id <= count; id++) {
        controller.signal.throwIfAborted();
        const m = await c.getModel(id);
        const entry = {
          id: m.id.toString(),
          name: m.name,
          owner: m.owner,
          price: formatEther(m.price),
          royalty: m.royalty.toString(),
          active: m.active,
          cid: m.cid,
          ...(await metadata(id,{signal:controller.signal})),
        };
        if (m.owner.toLowerCase() === account.toLowerCase()) mine.push(entry);
        if (await c.hasLicense(id, account)) owned.push(entry);
      }
      const earnings = formatEther(await c.pendingWithdrawals(account));
      if (request !== revision.current) return;
      setModels(mine);
      setLicenses(owned);
      setRevenue(earnings);
      setStatus("");
    } catch (e) {
      if (request === revision.current) setStatus(errorText(e));
    } finally {
      if (request === revision.current) setBusy(false);
    }
  }
  useEffect(() => {
    const requests = revision;
    let disposed = false;
    const changed = (accounts) => {
      const a = accounts[0] || "";
      if (disposed) return;
      revision.current++;
      setAddress(a);
      setModels([]);
      setLicenses([]);
      setRevenue("0");
      setBusy(false);
      setStatus(
        a
          ? "Reading blockchain…"
          : "Connect your wallet to view your models and licenses.",
      );
      if (a) load(a);
    };
    changed(identity.authenticated ? [identity.authenticated] : []);
    return () => {
      disposed = true;
      loadController.current?.abort();
      requests.current++;
    };
  }, [identity.authenticated]);
  async function connect() {
    try {
      if (identity.authenticated) await load(identity.authenticated);
    } catch (e) {
      setStatus(errorText(e));
    }
  }
  async function action(kind, m) {
    setBusy(true);
    try {
      const w = await wallet();
      if (
        kind === "withdraw" &&
        (await w.contract.pendingWithdrawals(w.address)) === 0n
      )
        throw new Error("No revenue is available for this wallet.");
      if (
        kind !== "withdraw" &&
        (await w.contract.getModel(m.id)).owner.toLowerCase() !==
          w.address.toLowerCase()
      )
        throw new Error("Only the model creator can change its status.");
      await assertCurrentWallet(w.address);
      setStatus("Confirm in MetaMask…");
      const tx =
        kind === "withdraw"
          ? await w.contract.withdrawRevenue()
          : await w.contract.setModelActive(m.id, !m.active);
      setStatus("Transaction submitted. Waiting for confirmation…");
      const receipt = await tx.wait();
      if (receipt?.status !== 1) throw new Error("Transaction failed.");
      await assertCurrentWallet(w.address);
      await load(w.address);
    } catch (e) {
      setStatus(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  function rows(items, creator) {
    return items.length ? (
      <div className="dashboard-models">
        {items.map((m) => (
          <article className="dashboard-model" key={m.id}>
            <div>
              <span className="model-category">
                #{m.id} · {m.active ? "Active" : "Inactive"}
              </span>
              <h3>
                <Link to={`/model/${m.id}`}>{m.name}</Link>
              </h3>
              <p>
                {m.price} ETH · Creator share {m.royalty}%
              </p>
              <p title={m.cid}>{short(m.cid)}</p>
            </div>
            <div>
              {creator && (
                <button disabled={busy} onClick={() => action("status", m)}>
                  {m.active ? "Deactivate" : "Reactivate"}
                </button>
              )}
              <Link to={`/model/${m.id}`}>
                {creator ? "View details" : "Access & verify"} →
              </Link>
            </div>
          </article>
        ))}
      </div>
    ) : (
      <div className="empty-state">
        {busy
          ? "Reading blockchain…"
          : creator
            ? "No models registered. Models registered by this wallet will appear here."
            : "No licenses yet. Models licensed by this wallet will appear here."}
        <p>
          <Link to={creator ? "/upload-model" : "/marketplace"}>
            {creator ? "Register model" : "Explore models"} →
          </Link>
        </p>
      </div>
    );
  }
  if (!identity.authenticated)
    return (
      <main className="page">
        <p className="eyebrow">YOUR WORKSPACE</p>
        <h1>Your workspace</h1>
        <p>
          Sign in with MetaMask to view models, licenses and revenue associated
          with your wallet.
        </p>
        <WalletGate action="view your workspace" />
      </main>
    );
  return (
    <div className="dashboard-page">
      <main className="dashboard-content">
        <div className="section-label">YOUR WORKSPACE</div>
        <h1>Overview</h1>
        <p>Ownership and licenses are read directly from ModelChain.</p>
        <p className="caption">
          Withdrawable revenue is pendingWithdrawals for this authenticated
          wallet. Creator shares and platform fees can belong to the same
          wallet; buying alone earns no revenue.
        </p>
        <button onClick={connect} disabled={busy}>
          {address ? short(address) : "Connect wallet"}
        </button>
        <p role="status">{status}</p>
        <section className="dashboard-grid">
          <article className="dashboard-card">
            <h2>{models.length}</h2>
            <p>Models Owned</p>
          </article>
          <article className="dashboard-card">
            <h2>{licenses.length}</h2>
            <p>Licensed Models</p>
          </article>
          <article className="dashboard-card">
            <h2>{revenue} ETH</h2>
            <p>Withdrawable revenue</p>
            <button
              disabled={busy || revenue === "0.0" || revenue === "0"}
              onClick={() => action("withdraw")}
            >
              Withdraw
            </button>
          </article>
          <article className="dashboard-card">
            <p>Current Network</p>
            <NetworkBadge />
          </article>
        </section>
        <h2>My Models</h2>
        {rows(models, true)}
        <h2>My Licenses</h2>
        {rows(licenses, false)}
      </main>
    </div>
  );
}
