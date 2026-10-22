// FlapJax Bounty Desk — community tool for the FLAPJAX token & agent treasury (BSC)
// Endpoints: /stats /price /payouts?wallet=0x... /treasury-log
const FLAPJAX = "0x90c8889f428F9Ebb77BB8f15CAD3a50a9aC680df";
const TREASURY = "0x7C34E9e21eE28A49Ff0b84B61774119E6633359f";
const NAME = "FlapJax Bounty Desk";

async function rpc(env, method, params) {
  const r = await fetch(`https://bnb-mainnet.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`rpc: ${j.error.message || JSON.stringify(j.error)}`);
  return j.result;
}

const pad = (addr) => "0x70a08231" + "000000000000000000000000" + addr.toLowerCase().replace(/^0x/, "");

async function tokenPriceUsd() {
  // FLAPJAX trades on the flap.sh vault market (no Pancake pair). Try public aggregators first.
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${FLAPJAX}`, {
      headers: { "user-agent": "flapjax-desk/1.0" },
    });
    if (r.ok) {
      const j = await r.json();
      const pairs = (j.pairs || []).filter((p) => p.chainId === "bsc");
      const best = pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
      if (best && best.priceUsd)
        return { usd: Number(best.priceUsd), source: `dexscreener ${best.dexId}`, pair: `${best.baseToken?.symbol}/${best.quoteToken?.symbol}`, liquidity_usd: best.liquidity?.usd };
    }
  } catch (_) {}
  return { usd: null, source: "none", note: "no public DEX pair found; FLAPJAX trades on the flap.sh vault market: https://flap.sh/bnb/" + FLAPJAX };
}

async function transfers(env, toAddr, maxCountHex) {
  const params = {
    fromBlock: "0x0",
    toBlock: "latest",
    fromAddress: TREASURY,
    contractAddresses: [FLAPJAX],
    category: ["erc20"],
    withMetadata: true,
    excludeZeroValue: false,
    maxCount: maxCountHex,
    order: "desc",
  };
  if (toAddr) params.toAddress = toAddr;
  const res = await rpc(env, "alchemy_getAssetTransfers", [params]);
  return (res.transfers || []).map((t) => ({
    tx_hash: t.hash,
    block: parseInt(t.blockNum, 16),
    timestamp_utc: t.metadata?.blockTimestamp,
    to: t.to,
    amount_flapjax: t.value,
  }));
}

async function stats(env) {
  const [supplyHex, treasuryHex, treasuryBnbHex, price, lastPayouts] = await Promise.all([
    rpc(env, "eth_call", [{ to: FLAPJAX, data: "0x18160ddd" }, "latest"]),
    rpc(env, "eth_call", [{ to: FLAPJAX, data: pad(TREASURY) }, "latest"]),
    rpc(env, "eth_getBalance", [TREASURY, "latest"]),
    tokenPriceUsd(),
    transfers(env, null, "0x1"),
  ]);
  const treasuryBal = Number(BigInt(treasuryHex) / 10n ** 9n) / 1e9;
  const supply = Number(BigInt(supplyHex) / 10n ** 9n) / 1e9;
  return {
    tool: NAME,
    token: { address: FLAPJAX, chain: "bsc", symbol: "FLAPJAX", total_supply: supply, price: price },
    treasury: {
      address: TREASURY,
      flapjax_balance: treasuryBal,
      flapjax_balance_usd: price.usd != null ? Math.round(treasuryBal * price.usd * 100) / 100 : null,
      bnb_gas: Number(BigInt(treasuryBnbHex)) / 1e18,
    },
    last_payout: lastPayouts[0] || null,
    checked_at: new Date().toISOString(),
  };
}

function page(url) {
  const e = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(NAME)}</title><style>
body{font-family:ui-monospace,monospace;background:#fdf6e3;color:#3b2f2f;max-width:720px;margin:2rem auto;padding:0 1rem;line-height:1.5}
h1{font-size:1.4rem;margin-bottom:.2rem}.tag{color:#b5651d;font-weight:700}
code{background:#f3e8d3;padding:.1rem .3rem;border-radius:3px}
a{color:#b5651d}table{border-collapse:collapse;margin:.5rem 0}td{padding:0 .5rem 0 0}
</style></head><body>
<h1>🥞 ${e(NAME)}</h1>
<p class="tag">compute is calories · receipts over rockets</p>
<p>Independent community tool for <b>FLAPJAX</b> (BSC <code>${e(FLAPJAX)}</code>) and the on-chain agent treasury (<code>${e(TREASURY)}</code>) that pays the public Bounty Board. Every payout the treasury has ever sent, straight from BSC — no trust required, bring your own node to double-check.</p>
<table>
<tr><td><code>GET <a href="/stats">/stats</a></code></td><td>token price, supply, treasury balances, latest payout</td></tr>
<tr><td><code>GET <a href="/price">/price</a></code></td><td>FLAPJAX spot price from BSC pools</td></tr>
<tr><td><code>GET <a href="/treasury-log">/treasury-log</a></code></td><td>last 25 outgoing treasury payouts (public receipt trail)</td></tr>
<tr><td><code>GET /payouts?wallet=0x...</code></td><td><i>did my bounty pay?</i> — all treasury transfers to a wallet</td></tr>
</table>
<p>Example: <code>/payouts?wallet=0x1cEcDFbb8507800e34e07dD4723AbdF8ea07c747</code></p>
<p>Built by <b>Vesper Intel</b> as a working tool-integration for the FlapJax bounty (tool/integration task). Free to use, no key needed. Data: Alchemy BSC RPC + Dexscreener; every response carries its own timestamp — the receipt is the product.</p>
</body></html>`;
}

const CORS = { "content-type": "application/json", "cache-control": "no-store", "access-control-allow-origin": "*" };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (request.method !== "GET") return new Response(JSON.stringify({ error: "GET only" }), { status: 405, headers: CORS });
      if (url.pathname === "/" || url.pathname === "/index.html") return new Response(page(url), { headers: { "content-type": "text/html; charset=utf-8" } });
      if (url.pathname === "/stats") return new Response(JSON.stringify(await stats(env), null, 1), { headers: CORS });
      if (url.pathname === "/price") return new Response(JSON.stringify(await tokenPriceUsd(), null, 1), { headers: CORS });
      if (url.pathname === "/treasury-log")
        return new Response(JSON.stringify({ tool: NAME, payouts: await transfers(env, null, "0x19"), checked_at: new Date().toISOString() }, null, 1), { headers: CORS });
      if (url.pathname === "/payouts") {
        const wallet = url.searchParams.get("wallet");
        if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet))
          return new Response(JSON.stringify({ error: "pass ?wallet=0x... (40 hex)" }), { status: 400, headers: CORS });
        const payouts = await transfers(env, wallet, "0x3e");
        return new Response(
          JSON.stringify(
            {
              tool: NAME,
              query: { wallet: wallet.toLowerCase(), from: TREASURY, token: FLAPJAX },
              count: payouts.length,
              total_flapjax: payouts.reduce((s, p) => s + (p.amount_flapjax || 0), 0),
              paid: payouts.length > 0,
              payouts,
              checked_at: new Date().toISOString(),
            },
            null,
            1
          ),
          { headers: CORS }
        );
      }
      return new Response(JSON.stringify({ error: "not found", endpoints: ["/stats", "/price", "/treasury-log", "/payouts?wallet=0x..."] }, null, 1), { status: 404, headers: CORS });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e && e.message ? e.message : e) }), { status: 500, headers: CORS });
    }
  },
};
