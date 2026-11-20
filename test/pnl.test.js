import test from "node:test";
import assert from "node:assert/strict";
import { computePnl } from "../lib/pnl.js";

let clock = 0;
const buy = (mint, tokens, solSpent) => ({ type: "buy", mint, tokenAmount: tokens, quote: "SOL", quoteAmount: solSpent, time: ++clock, fee: 0.00001 });
const sell = (mint, tokens, solGot) => ({ type: "sell", mint, tokenAmount: tokens, quote: "SOL", quoteAmount: solGot, time: ++clock, fee: 0.00001 });
const transferOut = (mint, tokens) => ({ type: "transfer_out", mint, tokenAmount: tokens, time: ++clock });
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} is not ${b}`);

test("a full round trip books realized profit and nothing open", () => {
  const { rows, totals } = computePnl([buy("A", 100, 1), sell("A", 100, 3)]);
  near(rows[0].realized, 2);
  near(rows[0].roi, 200);
  assert.equal(rows[0].open, 0);
  assert.equal(totals.winRate, 100);
  near(totals.fees, 0.00002);
});

test("tokens sent away by transfer are not counted as open positions", () => {
  const { rows, totals } = computePnl([buy("A", 100, 1), transferOut("A", 100)], { prices: new Map([["A", 0.02]]) });
  assert.equal(rows[0].open, 0);
  assert.equal(rows[0].openCost, 0);
  assert.equal(rows[0].openValue, 0);
  near(rows[0].transferredOutCost, 1);
  near(totals.transferredOutCost, 1);
});

test("partial transfer_out leaves remaining share open at average cost", () => {
  const { rows, totals } = computePnl([buy("A", 100, 1), sell("A", 25, 0.5), transferOut("A", 25)], { prices: new Map([["A", 0.02]]) });
  assert.equal(rows[0].open, 50);
  near(rows[0].openCost, 0.5);
  near(rows[0].openValue, 50 * 0.02);
  near(rows[0].transferredOutCost, 0.25);
  near(totals.transferredOutCost, 0.25);
  near(rows[0].realized, 0.25);
});

test("a partial sell only realizes the sold share; the rest stays open at cost", () => {
  const { rows } = computePnl([buy("A", 100, 2), sell("A", 25, 1)], { prices: new Map([["A", 0.04]]) });
  near(rows[0].realized, 1 - 0.5);
  near(rows[0].openCost, 1.5);
  near(rows[0].openValue, 75 * 0.04);
  near(rows[0].unrealized, 3 - 1.5);
});

test("selling more than was bought in the window is not counted as profit", () => {
  const { rows, totals } = computePnl([buy("A", 100, 1), sell("A", 400, 8)]);
  near(rows[0].realized, 2 - 1); // a quarter of the proceeds match the tracked buy
  near(rows[0].unmatched, 6);
  near(totals.unmatched, 6);
});

test("a sell with no buy in the window is all unmatched and not a win", () => {
  const { rows, totals } = computePnl([sell("A", 10, 5)]);
  near(rows[0].realized, 0);
  near(rows[0].unmatched, 5);
  assert.equal(totals.closed, 0);
  assert.equal(totals.winRate, null);
});

test("stablecoin trades convert to SOL, swaps are skipped, transfers do not trade", () => {
  const trades = [
    { type: "buy", mint: "A", tokenAmount: 10, quote: "USD", quoteAmount: 150, time: 1 },
    { type: "sell", mint: "A", tokenAmount: 10, quote: "USD", quoteAmount: 300, time: 2 },
    { type: "swap", mint: "B", tokenAmount: 1, fromMint: "A", fromAmount: 1, time: 3 },
    { type: "transfer_in", mint: "C", tokenAmount: 5, time: 4 },
  ];
  const { rows, totals } = computePnl(trades, { solUsd: 150 });
  assert.equal(rows.length, 1);
  near(rows[0].realized, 1);
  assert.equal(totals.skippedSwaps, 1);
});

test("open positions without a price are flagged, and losers lower the win rate", () => {
  const { totals, rows } = computePnl([buy("A", 10, 1), sell("A", 10, 0.2), buy("B", 10, 1), sell("B", 10, 2), buy("C", 10, 1)]);
  assert.equal(totals.winRate, 50);
  assert.equal(totals.unpriced, 1);
  assert.equal(rows[0].mint, "B");
  near(totals.realized, 0.2);
});

test("a sell before any buy in the window is unmatched, and a later buy stays open", () => {
  // tokens from before the window are sold for 5 SOL, then 100 are bought back for 1 SOL
  const { rows, totals } = computePnl([sell("A", 100, 5), buy("A", 100, 1)], { prices: new Map([["A", 0.01]]) });
  near(rows[0].realized, 0);
  near(rows[0].unmatched, 5);
  assert.equal(rows[0].roi, null);
  assert.equal(rows[0].open, 100);
  near(rows[0].openCost, 1);
  near(rows[0].openValue, 1);
  assert.equal(totals.closed, 0);
  assert.equal(totals.winRate, null);
});

test("trades are replayed in time order, whatever order they are passed in", () => {
  // buy 100 for 1, sell 100 for 3, then buy 50 again for 2 (newest first, as the RPC lists them)
  const trades = [buy("A", 100, 1), sell("A", 100, 3), buy("A", 50, 2)].reverse();
  const { rows } = computePnl(trades);
  near(rows[0].realized, 2);
  near(rows[0].roi, 200);
  assert.equal(rows[0].open, 50);
  near(rows[0].openCost, 2);
});

test("a sell only matches tokens still held after earlier sells", () => {
  // buy 100 for 1, sell 100 for 2, sell 100 more (from before the window) for 4, buy 100 for 3
  const { rows } = computePnl([buy("A", 100, 1), sell("A", 100, 2), sell("A", 100, 4), buy("A", 100, 3)]);
  near(rows[0].realized, 1);
  near(rows[0].unmatched, 4);
  assert.equal(rows[0].open, 100);
  near(rows[0].openCost, 3);
});
