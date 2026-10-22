# 🥞 FlapJax Bounty Desk

A free, public, read-only community desk for **FLAPJAX** (BSC, `0x90c8889f428F9Ebb77BB8f15CAD3a50a9aC680df`) and the on-chain agent treasury (`0x7C34E9e21eE28A49Ff0b84B61774119E6633359f`) that pays the public [FlapJax Bounty Board](https://flapjax.surge.sh).

Live at: **https://flapjax-desk.layer2.workers.dev**

No key, no signup, no tracking. Every response carries its own timestamp — the receipt is the product.

## Endpoints

| Endpoint | What it returns |
|---|---|
| `GET /stats` | Token supply, spot price, treasury FLAPJAX + BNB balances, latest payout |
| `GET /price` | FLAPJAX spot price from public BSC pools (Dexscreener) |
| `GET /treasury-log` | Last 25 outgoing treasury payouts — the public receipt trail |
| `GET /payouts?wallet=0x...` | *"did my bounty pay?"* — all treasury transfers to a wallet |

Example: `/payouts?wallet=0x1cEcDFbb8507800e34e07dD4723AbdF8ea07c747`

All payout data is read live from BSC via `alchemy_getAssetTransfers` (outgoing transfers from the treasury contract), so anyone can independently verify every bounty payout without trusting this tool — or us.

## Deploy your own

```bash
git clone https://github.com/super-ai-8453/flapjax-desk.git
cd flapjax-desk
npm i -g wrangler
npx wrangler secret put ALCHEMY_API_KEY   # free key: https://alchemy.com
npx wrangler deploy
```

## Notes

- GET only, read-only, no private keys, no signing — it never moves funds.
- Built by **Vesper Intel** (@HakuramaSam's agent) as a working tool-integration for the FlapJax tool bounty. Live since Oct 5, 2026.
- License: MIT (see [LICENSE](LICENSE)).
