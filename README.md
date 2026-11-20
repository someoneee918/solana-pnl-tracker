# Solana PnL Tracker

Profit and loss for any Solana wallet's memecoin trades, worked out from its on-chain transactions. Realized profit, open positions at live prices, win rate and per-token ROI, in SOL.

![Node 22+](https://img.shields.io/badge/node-%E2%89%A522-5FA04E?logo=node.js&logoColor=white) ![Dependencies: 0](https://img.shields.io/badge/dependencies-0-2ea44f) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) [![Website](https://img.shields.io/badge/website-blixtrade.github.io-8b5cf6)](https://blixtrade.github.io/solana-pnl-tracker/)

> Free and open source, part of the [Blix Trade](https://github.com/blixtrade) toolkit. For the live version with AI ratings on every coin, wallet tracking and one-click trading at 0% fees, see **[BLIX, the Solana memecoin terminal](https://blixvip.com/solana-pnl-tracker?utm_source=github&utm_medium=readme&utm_campaign=solana-pnl-tracker)**.

## What it does

- Per-token buys, sells, SOL spent and received, realized profit, ROI, and what is still held.
- Open positions are valued at the current price, shown separately from cash profit so paper gains never look like real ones.
- Win rate over tokens that were both bought and sold in the window.
- Honest about the window: SOL from selling tokens bought before the window is shown as unmatched, not as profit.

## Quick start

You need [Node.js](https://nodejs.org) 22 or newer. There is nothing else to install: no dependencies, no API keys.

Run it straight from GitHub:

```bash
npx -y github:blixtrade/solana-pnl-tracker <wallet>
```

Or clone it:

```bash
git clone https://github.com/blixtrade/solana-pnl-tracker.git
cd solana-pnl-tracker
node bin/pnl.js <wallet>
```

To get a `pnl` command on your PATH, run `npm link` inside the folder.

## Example output

Real output from a run on 18 November 2026:

```text
Wallet PnL  BAqdbpSEci3MjiPqB7kdqKt5sKgFsE79MBvSDsXbexx3
60 transactions, 18 Nov, 16:26 to 18 Nov, 17:48  ·  60 token trades in 2 tokens

  Realized (cash)        +1.546 SOL ($112)
  Open positions         cost 1.178 SOL, worth 1.257 SOL now (+0.079 SOL on paper)
  Win rate               100% (1 of 1 tokens sold at a profit)
  Bought / sold          74.069 SOL in, 101.089 SOL out
  Network fees           0.0175 SOL
  Unmatched sales        26.652 SOL came from tokens bought before this window or received by transfer. Not counted as profit.

Token         Buys  Sells      Spent   Received   Realized       ROI  Open cost   Open now  Mint
DCTY            31     23     74.069     74.438     +1.546       +2%      1.178      1.257  9hjBLBrc7WZW2H8UQvBAvG5WiTZotXUv2Bdcn4f4pump
mihao            0      3      0.000     26.652     +0.000         -          -          -  4CxjZyMNoF1p6eXHXHv1TWpS2X47CuUmLwtGe18spump

All amounts in SOL. Only the 60 most recent transactions are counted; stablecoin trades are converted at the current SOL price.
```

## Options

```text
solana-pnl-tracker: profit and loss for any Solana wallet, in SOL

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
```

## How it works

- Uses the same trade parser as solana-wallet-tracker, then average-cost accounting per token.
- Only the sold share of what was bought inside the window is matched against its cost.
- Stablecoin trades are converted to SOL at the current SOL price.

## Limits

- It reads the most recent `--txs` transactions (default 100, up to 1,000). Older history is not counted.
- Token-for-token swaps have no SOL price and are left out (the count is shown).
- On the free public RPC, 100 transactions take about two minutes. Set `SOLANA_RPC_URL` for speed.

## Development

```bash
npm test
```

Tests run offline against fixtures, so they never depend on a live API.

## Contributing

Pull requests are welcome, and first-timers are too. Pick an issue labelled [good first issue](https://github.com/blixtrade/solana-pnl-tracker/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) or [help wanted](https://github.com/blixtrade/solana-pnl-tracker/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22), comment that you are taking it, and read [CONTRIBUTING.md](CONTRIBUTING.md). No API keys needed: the tests run offline.

[![Contributors](https://contrib.rocks/image?repo=blixtrade/solana-pnl-tracker)](https://github.com/blixtrade/solana-pnl-tracker/graphs/contributors)

## More free Solana tools from Blix Trade

| Tool | What it does |
|---|---|
| [solana-bubble-map](https://github.com/blixtrade/solana-bubble-map) | Holder bubble map for any Solana or pump.fun token. |
| [pump-fun-tracker](https://github.com/blixtrade/pump-fun-tracker) | Every new pump.fun launch on Solana, live in your terminal, the moment it is created. |
| [solana-rug-checker](https://github.com/blixtrade/solana-rug-checker) | Rug pull scanner for Solana and pump.fun tokens. |
| [solana-memecoin-screener](https://github.com/blixtrade/solana-memecoin-screener) | Screen trending, new and boosted Solana memecoins from the terminal. |
| [solana-wallet-tracker](https://github.com/blixtrade/solana-wallet-tracker) | Follow any Solana wallets and see every memecoin buy and sell they make: token, size in SOL and USD, and a Solscan link. |
| [solana-whale-tracker](https://github.com/blixtrade/solana-whale-tracker) | Big buys and sells on any Solana token: net whale flow, every large trade with a Solscan link, and leaderboards of the wallets buying and dumping the most. |
| [memecoin-paper-trading](https://github.com/blixtrade/memecoin-paper-trading) | Practise Solana memecoin trading with fake SOL at real prices. |
| [memecoin-alert-bot](https://github.com/blixtrade/memecoin-alert-bot) | pump.fun alerts in Telegram and Discord. |
| [pump-fun-mcp](https://github.com/blixtrade/pump-fun-mcp) | An MCP server that gives Claude, Cursor and other AI assistants six Solana memecoin research tools: token info, rug check, top holders, a screener, whale trades and wallet trades. |

Want all of this in one place, live, with AI on every coin? **[Open BLIX](https://blixvip.com/?utm_source=github&utm_medium=readme&utm_campaign=solana-pnl-tracker)**: the Solana memecoin terminal with 0% trading fees.

## Disclaimer

This is research software, not financial advice. Memecoins are extremely volatile and most go to zero. Never trade more than you can afford to lose. The data comes from free third-party APIs that can be wrong, late or unavailable.

## License

[MIT](LICENSE)
