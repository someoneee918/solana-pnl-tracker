import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "bin", "pnl.js");
const WALLET = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";

function run(args) {
  return spawnSync(process.execPath, [cli, WALLET, ...args], { encoding: "utf8" });
}

test("--top 0 is rejected before any network call", () => {
  const r = run(["--top", "0"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr + r.stdout, /--top must be a whole number of 1 or more/);
});

test("--top -1 is rejected before any network call", () => {
  const r = run(["--top", "-1"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr + r.stdout, /--top must be a whole number of 1 or more/);
});

test("a non-numeric --top is rejected", () => {
  const r = run(["--top", "abc"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr + r.stdout, /--top must be a whole number of 1 or more/);
});

test("a fractional --top is rejected", () => {
  const r = run(["--top", "2.5"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr + r.stdout, /--top must be a whole number of 1 or more/);
});

test("--version prints package version and exits 0", () => {
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  const r = spawnSync(process.execPath, [cli, "--version"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.match(r.stdout, new RegExp(`solana-pnl-tracker ${pkg.version}`));
});
