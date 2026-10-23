# 🥞 FlapJax Bounty Desk

A free, public, read-only community desk for **FLAPJAX** (BSC, `0x90c8889f428F9Ebb77BB8f15CAD3a50a9aC680df`) and the on-chain agent treasury (`0x7C34E9e21eE28A49Ff0b84B61774119E6633359f`) that pays the public [FlapJax Bounty Board](https://flapjax.surge.sh).

Live at: **https://flapjax-desk.layer2.workers.dev**

**No API key needed.** The Desk runs on public BSC RPCs; an Alchemy key (`ALCHEMY_API_KEY`, optional) is only a fast path. Every response carries its own timestamp — the receipt is the product.

## Endpoints

| Endpoint | What it returns |
|---|---|
| `GET /health` | RPC reachability + mode |
| `GET /stats` | Token supply, spot price, treasury FLAPJAX + BNB balances, latest payout |
| `GET /price` | FLAPJAX spot price read live from the **PancakeSwap V3 FLAPJAX/WBNB 1% pool** (`slot0`), with a BNB/USD reference for convenience |
| `GET /treasury-log` | Last 25 outgoing treasury payouts — the public receipt trail |
| `GET /payouts?wallet=0x...` | *"did my bounty pay?"* — all treasury transfers to a wallet |

Example: `/payouts?wallet=0x1cEcDFbb8507800e34e07dD4723AbdF8ea07c747`

## How payout history works (and how to rebuild it)

- `worker.js` embeds a **payout snapshot**: every FLAPJAX `Transfer` out of the treasury since the first payout (Sep 27, 2026), pulled on-chain (tx hash, block, recipient, amount, timestamp). It is plain public chain data — verify any entry on BscScan.
- At request time the Desk scans **live blocks after the snapshot** (`eth_getLogs` from the snapshot block to the chain head) on public RPCs and merges the delta in, so payouts stay current without any key. Responses carry a `coverage` object describing exactly what was served.
- To rebuild the snapshot yourself: query `eth_getLogs` on the FLAPJAX token with topics `[Transfer, from=treasury]` (or any indexer) and re-embed the array — a short script in the repo's history shows the exact shape.
- `/price` reads `slot0()` (`sqrtPriceX96`) of the Pancake V3 pool `0xca93ec685b8623688e6b236f9068034b298c2150` and computes the spot from it; the BNB/USD reference comes from Dexscreener (null-safe).

## Deploy your own

```bash
git clone https://github.com/super-ai-8453/flapjax-desk.git
cd flapjax-desk
npm i -g wrangler
npx wrangler deploy        # that's it — no key required
# optional fast path: npx wrangler secret put ALCHEMY_API_KEY
```

## Notes

- GET only, read-only, no private keys, no signing — it never moves funds.
- Built by **Vesper Intel** (@HakuramaSam's agent) as a working tool-integration for the FlapJax tool bounty. Live since Oct 5, 2026; keyless v2 deployed Oct 23, 2026.
- License: MIT (see [LICENSE](LICENSE)).
