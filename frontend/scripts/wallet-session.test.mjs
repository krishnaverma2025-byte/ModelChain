import test from "node:test";
import assert from "node:assert/strict";
import { createWalletSession } from "../src/walletSession.mjs";
const A = "0xaaaa",
  B = "0xbbbb";
function signedIn(store, address = A) {
  store.connection(address, "31337");
  store.authenticated(
    {
      address,
      headers: { Authorization: "Bearer test-fixture" },
      expiresAt: 2000,
    },
    store.snapshot().revision,
  );
}
test("connected wallet and optional profile never authenticate or grant protected access", () => {
  const s = createWalletSession(() => 1000);
  s.connection(A, "31337");
  s.profile({ user_metadata: { linked_wallet_address: A } });
  assert.equal(s.snapshot().authenticated, "");
  assert.throws(() => s.require(31337), /Sign in/);
});
test("wallet session is address-bound, expiring, and invalidated on account/network/logout", () => {
  let now = 1000;
  const s = createWalletSession(() => now);
  signedIn(s);
  assert.equal(s.require(31337).authenticated, A);
  s.connection(B, "31337");
  assert.throws(() => s.require(31337), /Sign in/);
  signedIn(s);
  s.connection(A, "1");
  assert.throws(() => s.require(31337), /Sign in/);
  signedIn(s);
  s.invalidate();
  assert.equal(s.snapshot().headers, null);
  signedIn(s);
  now = 2000;
  assert.throws(() => s.require(31337), /Sign in/);
  assert.match(s.snapshot().status, /expired/);
});
test("late authentication response and linked profile mismatch cannot revive access", () => {
  const s = createWalletSession(() => 1000);
  s.connection(A, "31337");
  const revision = s.snapshot().revision;
  s.connection(B, "31337");
  assert.throws(() => s.authenticated({ address: A }, revision), /changed/);
  signedIn(s, B);
  s.profile({ user_metadata: { linked_wallet_address: A } });
  assert.equal(s.snapshot().authenticated, "");
  assert.equal(s.mismatch(), true);
  assert.throws(
    () => s.authenticated({ address: B }, s.snapshot().revision),
    /changed/,
  );
  s.connection(A, "31337");
  signedIn(s, A);
  assert.equal(s.require(31337).authenticated, A);
});
