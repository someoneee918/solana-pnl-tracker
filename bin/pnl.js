#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { c, footer, getTx, isAddress, main, parseArgs, rpc, short, table, pad } from "../lib/core.js";
import { parseWalletTx, solUsd, tokenInfo } from "../lib/swaps.js";
import { computePnl } from "../lib/pnl.js";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

const HELP = `solana-pnl-tracker: profit and loss for any Solana wallet, in SOL

Usage:
  pnl <wallet> [options]

Options:
  --txs <n>       Recent transactions to read, 10 to 1000 (default 100)
  --top <n>       Tokens to list (default 20)
  --json          Print the full result as JSON
  --version       Show version
  --help          Show this help

Environment:
  SOLANA_RPC_URL  Your own RPC endpoint. The public one reads about one transaction
                  a second, so 100 transactions take about two minutes.
`;

const sol = (n, digits = 3) => (n === null || n === undefined ? c.dim("?") : (n >= 0 ? "+" : "") + n.toFixed(digits));
const tint = (n, text) => (n === null || n === undefined ? text : n > 0.0005 ? c.green(text) : n < -0.0005 ? c.red(text) : text);

main(async () => {
  const args = parseArgs(process.argv.slice(2), { booleans: ["json", "help", "version"] });
  if (args.version) { console.log(`solana-pnl-tracker ${pkg.version}`); process.exit(0); }
  const wallet = args._[0];
  if (args.help || !wallet) { console.log(HELP); process.exit(args.help ? 0 : 1); }
  if (!isAddress(wallet)) throw new Error(`"${wallet}" is not a Solana address.`);
  if (args.top !== undefined) {
    const top = Number(args.top);
    if (args.top === "" || args.top === true || !Number.isInteger(top) || top < 1) {
      throw new Error("--top must be a whole number of 1 or more");
    }
  }
  const want = Math.max(10, Math.min(1000, Number(args.txs) || 100));
  const tty = process.stderr.isTTY && !args.json;

  const sigs = (await rpc("getSignaturesForAddress", [wallet, { limit: want }])).filter((s) => !s.err);
  if (!sigs.length) throw new Error("This wallet has no successful transactions.");
  const trades = [];
  let unreadable = 0;
  for (let i = 0; i < sigs.length; i++) {
    if (tty) process.stderr.write(`\r${c.dim(`Reading transaction ${i + 1}/${sigs.length}…`)}`);
    try {
      const trade = parseWalletTx(await getTx(sigs[i].signature), wallet);
      if (trade) trades.push(trade);
    } catch { unreadable++; }
  }
  if (tty) process.stderr.write("\r" + " ".repeat(50) + "\r");

  const mints = [...new Set(trades.map((t) => t.mint))];
  const [info, solPrice] = await Promise.all([tokenInfo(mints), solUsd()]);
  const prices = new Map();
  for (const [mint, t] of info) if (t?.priceUsd && solPrice) prices.set(mint, t.priceUsd / solPrice);
  const result = computePnl([...trades].reverse(), { prices, solUsd: solPrice });
  for (const r of result.rows) r.symbol = info.get(r.mint)?.symbol || null;
  const span = { from: sigs.at(-1).blockTime * 1000, to: sigs[0].blockTime * 1000 };

  if (args.json) { console.log(JSON.stringify({ wallet, transactions: sigs.length, unreadable, span, solUsd: solPrice, ...result }, null, 2)); return; }

  const t = result.totals;
  const day = (ms) => new Date(ms).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  console.log(`\n${c.bold("Wallet PnL")}  ${c.dim(wallet)}`);
  console.log(c.dim(`${sigs.length} transactions, ${day(span.from)} to ${day(span.to)}  ·  ${trades.length} token trades in ${t.tokens} tokens\n`));
  if (!result.rows.length) { console.log("No token buys or sells in this window. Try a larger --txs."); return; }

  const usdOf = (n) => (solPrice ? c.dim(` ($${Math.abs(n * solPrice) >= 1000 ? (n * solPrice / 1000).toFixed(1) + "K" : (n * solPrice).toFixed(0)})`) : "");
  console.log(`  ${pad("Realized (cash)", 22)} ${tint(t.realized, c.bold(sol(t.realized) + " SOL"))}${usdOf(t.realized)}`);
  console.log(`  ${pad("Open positions", 22)} cost ${t.openCost.toFixed(3)} SOL, worth ${t.openValue.toFixed(3)} SOL now (${tint(t.unrealized, sol(t.unrealized) + " SOL")} on paper)`);
  if (t.unpriced) console.log(c.dim(`  ${pad("", 22)} ${t.unpriced} open position${t.unpriced > 1 ? "s have" : " has"} no price and count as zero.`));
  console.log(`  ${pad("Win rate", 22)} ${t.winRate === null ? "-" : `${t.winRate.toFixed(0)}% (${t.wins} of ${t.closed} tokens sold at a profit)`}`);
  console.log(`  ${pad("Bought / sold", 22)} ${t.spent.toFixed(3)} SOL in, ${t.received.toFixed(3)} SOL out`);
  console.log(`  ${pad("Network fees", 22)} ${t.fees.toFixed(4)} SOL`);
  if (t.unmatched > 0.0005) console.log(c.dim(`  ${pad("Unmatched sales", 22)} ${t.unmatched.toFixed(3)} SOL came from tokens bought before this window or received by transfer. Not counted as profit.`));
  console.log("");

  const top = Number(args.top) || 20;
  table(
    [
      { title: "Token", width: 12 }, { title: "Buys", width: 4, right: true }, { title: "Sells", width: 5, right: true },
      { title: "Spent", width: 9, right: true }, { title: "Received", width: 9, right: true }, { title: "Realized", width: 9, right: true },
      { title: "ROI", width: 8, right: true }, { title: "Open cost", width: 9, right: true }, { title: "Open now", width: 9, right: true }, { title: "Mint", width: 44 },
    ],
    result.rows.slice(0, top).map((r) => [
      c.bold(r.symbol || short(r.mint)), r.buys, r.sells, r.spent.toFixed(3), r.received.toFixed(3),
      tint(r.realized, sol(r.realized)), r.roi === null ? c.dim("-") : tint(r.roi, (r.roi >= 0 ? "+" : "") + r.roi.toFixed(0) + "%"),
      r.open > 0 ? r.openCost.toFixed(3) : c.dim("-"), r.open > 0 ? (r.openValue === null ? c.dim("?") : r.openValue.toFixed(3)) : c.dim("-"), c.dim(r.mint),
    ]),
  );
  if (result.rows.length > top) console.log(c.dim(`… and ${result.rows.length - top} more tokens (use --top).`));
  const notes = [];
  if (t.skippedSwaps) notes.push(`${t.skippedSwaps} token-for-token swaps were left out`);
  if (unreadable) notes.push(`${unreadable} transactions could not be read`);
  notes.push("stablecoin trades are converted at the current SOL price");
  console.log(c.dim(`\nAll amounts in SOL. Only the ${sigs.length} most recent transactions are counted; ${notes.join("; ")}.`));
  footer("/solana-pnl-tracker", "Full-history PnL for any wallet, realized vs open vs sellable");
});
