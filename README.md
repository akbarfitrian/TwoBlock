# TwoBlock

**TwoBlock** is a decentralized, wallet-native social media platform built on the **Arc** blockchain. Instead of usernames and passwords, identity on TwoBlock *is* your crypto wallet — every post, tip, follow, and reaction is tied directly to an on-chain address. It combines the familiar feel of a modern social feed with Web3-native primitives: smart-contract-routed USDC tipping, on-chain-verified transactions, a lifetime OG membership, and gamified quests — all without requiring a centralized login system.

> **Payments go through a contract, not P2P.** Tips and the OG membership purchase are both routed through a single on-chain contract, [`contracts/TwoBlockPayments.sol`](contracts/TwoBlockPayments.sol) — not raw wallet-to-wallet transfers. The contract emits `Tipped`/`OGPurchased` events that the backend verifies against instead of trusting client-submitted amounts/addresses. See [Smart contract](#smart-contract-twoblockpaymentssol) below.

> Built with Next.js 14 (App Router), TypeScript, Supabase (Postgres + Row Level Security), and viem, deployed on Vercel.

---

## Why TwoBlock is a Web3 social app

| Traditional social media | TwoBlock |
|---|---|
| Email/password or OAuth login | **Wallet-based auth** — connect MetaMask (or any EIP-1193 wallet), no accounts or secrets to manage |
| Likes | On-chain-adjacent **Agree / Disagree** reactions tied to your wallet |
| "Buy me a coffee" via third-party payment processors | **Native USDC tipping** sent directly wallet-to-wallet on the Arc chain, with transaction hashes recorded and verified on-chain |
| Paid blue-check subscriptions via credit card | **OG lifetime membership** — a single $28 on-chain USDC payment to a treasury wallet, unlocking higher post quotas, image uploads, polls, post editing, and gated posts, forever |
| Centralized identity | No email required — your **wallet address is your identity**, with an optional on-chain-linked username |

Arc is used here specifically because it treats **USDC as its native gas currency**, which means tipping is a plain native transfer — no ERC-20 contracts, no `approve()` calls, no gas token swaps. This keeps the tipping UX as close to a single tap as Web3 currently allows.

---

## Core features

- **Wallet-native authentication** — connects to `window.ethereum` directly (MetaMask or any injected wallet), with automatic network switching/adding for the Arc chain. No embedded wallet, no third-party auth provider, no App ID.
- **Feed & posts** — text posts, image attachments, and reposts, with per-tier daily quotas and character limits.
- **On-chain polls** — OG members can attach polls to posts; votes are open to everyone.
- **USDC tipping** — send USDC to another wallet from a post via the `TwoBlockPayments` contract's `tip()` function; the backend verifies the tx by decoding the contract's `Tipped` event before marking it confirmed.
- **OG membership** — a single lifetime $28 purchase via `purchaseOG()` on the same contract, which forwards USDC to the treasury wallet. OG unlocks a larger post quota, longer posts, image attachments, post editing (5-minute window), poll creation, gated (followers-only) posts, and member analytics.
- **Follows & profiles** — follow/unfollow, public profile pages per wallet, editable bio/avatar/username with a cooldown on username changes.
- **Reactions** — Agree/Disagree reactions on posts, feeding into notifications and quest progress.
- **Direct messages** — wallet-to-wallet messaging.
- **Notifications** — follows, reposts, tips, reactions, and poll results.
- **Quests** — lightweight gamification (first post, first tip sent, get OG, 7-day posting streak, plus an OG-exclusive "Gatekeeper" quest) to drive onboarding and engagement.
- **Leaderboard** — top-tipped posts panel, surfacing the most-rewarded content.

---

## Tech stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router, TypeScript, Server Components + API Routes)
- **Blockchain layer:** [viem](https://viem.sh/) for chain definition, wallet client, native USDC transfers, and transaction receipt verification
- **Chain:** [Arc](https://arc.network) — Circle's USDC-native EVM chain (currently targeting testnet; mainnet not yet publicly released)
- **Wallet:** Direct browser wallet integration via the EIP-1193 `window.ethereum` provider (MetaMask and compatible wallets) — no third-party wallet/auth SDK
- **Database:** [Supabase](https://supabase.com/) (Postgres) with Row Level Security enabled on every table
- **Storage:** Supabase Storage buckets for avatars and post images
- **Styling:** Tailwind CSS
- **Hosting:** [Vercel](https://vercel.com/)

---

## Smart contract (`TwoBlockPayments.sol`)

Both payment flows — tips and the OG membership purchase — go through a single deployed contract instead of a raw P2P native transfer:

```
contracts/
├── TwoBlockPayments.sol   # the contract
└── scripts/deploy.ts      # hardhat deploy script
hardhat.config.ts          # compiles contracts/, targets Arc testnet/mainnet
```

**Why route through a contract instead of P2P:**
- The contract emits `Tipped(from, to, amount, postId)` and `OGPurchased(wallet, amount)` events. The backend (`api/tips`, `api/og/purchase`) decodes these directly from the transaction receipt and rejects the request if they don't match what the client submitted, instead of trusting client-supplied `to`/`amount` values against a raw transfer's `to`/`value`. The receipt's block number also becomes `og_member_since_block`, so it can't be backdated.
- OG funds always land wherever the contract's `treasury` currently points, which the contract owner can update with `setTreasury()` — no need to change the frontend or redeploy to rotate treasury wallets.
- If a recipient can't accept a push transfer (e.g. a contract wallet with no payable fallback), funds are held in `pendingWithdrawals` instead of reverting the sender's transaction or getting stuck; the recipient calls `withdraw()` to pull them out.

**Functions:**
| Function | Called from | Effect |
|---|---|---|
| `tip(address to, string postId)` (payable) | `src/backend/lib/send-tip.ts` | Forwards `msg.value` to `to`, emits `Tipped` |
| `purchaseOG()` (payable, fixed `OG_PRICE` = 28 USDC) | `src/frontend/hooks/useOG.ts` | Forwards `msg.value` to `treasury`, sets `isOG[msg.sender] = true`, emits `OGPurchased` |
| `withdraw()` | anyone with a pending balance | Pulls out escrowed funds from a failed forward |
| `setTreasury(address)` | contract owner only | Updates where OG payments are forwarded |

**Deploying:**
```bash
npm install
# set DEPLOYER_PRIVATE_KEY and NEXT_PUBLIC_OG_TREASURY_WALLET in .env.local
npm run contracts:deploy:testnet
# copy the printed address into NEXT_PUBLIC_PAYMENTS_CONTRACT_ADDRESS in .env.local
```

If the ABI ever changes, keep `src/shared/contracts/two-block-payments.ts` (the frontend/backend's copy of the ABI) in sync with `contracts/TwoBlockPayments.sol`.

---

## Project structure

The codebase is split into `frontend/`, `backend/`, and `shared/` under `src/`. `src/app/` stays at the top level because Next.js's App Router requires it there for file-system routing — but within it, `app/api/**` is the backend's HTTP surface and everything else under `app/` is frontend routing (pages that render the components below).

```
twoblock/
├── src/
│   ├── app/                                   # Next.js App Router (routing only — both frontend pages and backend API routes)
│   │   ├── api/                                # Backend: HTTP routes, all using the Supabase service-role client
│   │   │   ├── profiles/onboard/route.ts        # Creates a profile on first wallet connect (username required)
│   │   │   ├── profiles/settings/route.ts       # Update bio/avatar/username
│   │   │   ├── profiles/sync/route.ts           # Sync/refresh profile state
│   │   │   ├── tips/route.ts                    # Records a tip and verifies the on-chain transaction
│   │   │   ├── posts/route.ts                   # Create text/poll posts and reposts (quota + limits, gated posts)
│   │   │   ├── posts/[id]/route.ts              # Edit a post (OG only, 5-minute window)
│   │   │   ├── posts/[id]/vote/route.ts         # Vote on a poll (final; open to everyone)
│   │   │   ├── follows/route.ts                 # Follow (POST) / unfollow (DELETE)
│   │   │   ├── reactions/route.ts               # Set (POST) / remove (DELETE) Agree/Disagree reactions
│   │   │   ├── messages/route.ts                # Direct messages
│   │   │   ├── notifications/route.ts           # Notifications feed
│   │   │   ├── quests/route.ts                  # Quest progress
│   │   │   ├── analytics/route.ts               # OG-only: tip totals & follower growth
│   │   │   └── og/purchase/route.ts             # Records the OG lifetime-membership purchase
│   │   ├── profile/[wallet]/page.tsx            # Frontend: public profile page for any wallet
│   │   ├── messages/                            # Direct message inbox and threads
│   │   ├── notifications/page.tsx
│   │   ├── quests/page.tsx
│   │   ├── search/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── og/page.tsx                          # "Get OG" purchase flow
│   │   ├── layout.tsx                           # Root layout — three-column shell (Sidebar / main / RightPanel)
│   │   ├── page.tsx                             # Home feed
│   │   └── providers.tsx                        # Global provider mount point
│   │
│   ├── frontend/                              # Everything that only ever runs in the browser
│   │   ├── components/                          # UI components (Feed, PostCard, PostComposer, modals, etc.)
│   │   ├── hooks/                                # Client hooks (auth, posts, follows, messages, quests, etc.)
│   │   └── lib/
│   │       ├── supabase-client.ts                # Browser Supabase client (anon key)
│   │       ├── format.ts                         # Formatting helpers
│   │       ├── linkify.tsx                       # Turns URLs/@mentions in post text into links
│   │       └── upload.ts                         # Avatar/post-image upload to Supabase Storage
│   │
│   ├── backend/                               # Everything that only ever runs on the server
│   │   └── lib/
│   │       ├── supabase-server.ts                # Server Supabase client (service role key — bypasses RLS)
│   │       ├── send-tip.ts                       # Calls TwoBlockPayments.tip() via viem WalletClient
│   │       └── og-treasury.ts                    # (deprecated) treasury wallet resolution — see contract's treasury()
│   │
│   ├── shared/                                # Used by both frontend and backend
│   │   ├── types.ts                              # Domain types (Profile, Post, PostWithAuthor, ...)
│   │   ├── tier-limits.ts                        # Free/OG quotas & limits (client cache + server-enforced source)
│   │   ├── quests.ts                             # Quest catalog + progress helpers
│   │   ├── chain.ts                              # Arc chain definitions (testnet + mainnet placeholder)
│   │   └── contracts/
│   │       └── two-block-payments.ts             # Contract ABI, address getter, OG price constant
│   │
│   └── types/
│       └── ethereum.d.ts                      # Ambient `window.ethereum` (EIP-1193) type declarations
│
├── contracts/                                 # TwoBlockPayments.sol + hardhat deploy script
├── supabase/migrations/                       # Ordered SQL migrations (0001 → 0010)
├── public/                                    # Static assets (logo, icons)
├── .env.example
├── hardhat.config.ts                          # Compiles/deploys contracts/ to Arc
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── vercel.json
```

**Import alias:** `@/*` maps to `src/*`, so imports read as `@/frontend/components/...`, `@/backend/lib/...`, or `@/shared/...`.

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

The project depends on two Web3/backend libraries used directly in the codebase:

- **`viem`** — Arc chain definition, transaction sending via a `WalletClient` wrapped around `window.ethereum`, address/unit helpers (`parseUnits`, `isAddress`, ...), and `waitForTransactionReceipt`.
- **`@supabase/supabase-js`** — browser client (anon key) and server client (service role key).

There is no third-party wallet SDK — wallet connection goes straight to MetaMask (or any other injected wallet) via `window.ethereum` (EIP-1193). See `src/frontend/hooks/useTwoBlockAuth.tsx` and `src/backend/lib/send-tip.ts`.

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_ARC_NETWORK` | `testnet` or `mainnet`. Stay on `testnet` until Arc's official mainnet chain ID and RPC are confirmed. |
| `NEXT_PUBLIC_ARC_RPC_URL` | Optional dedicated RPC endpoint for the Arc testnet, used instead of the shared public RPC. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key — **server-only, never expose to the client.** |
| `NEXT_PUBLIC_OG_TREASURY_WALLET` | Arc wallet address that receives OG membership payments. |

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll see a **Connect Wallet** button.

### 4. Set up Supabase

1. Create a new project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Run the migrations in order. Two options:

   **Supabase CLI (recommended):**
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

   **Manual, via the SQL Editor:** run each file in `supabase/migrations/` in order, `0001` through `0010`, one at a time. **Do not skip `0005_storage_buckets.sql`** — it creates the `avatars` and `post-images` Storage buckets; without it, avatar/image uploads fail with a "Bucket not found" error.

3. Grab your credentials from **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

#### Why the data layer is structured this way

- **Row Level Security is enabled on every table** (`0003_rls_policies.sql`). Because TwoBlock's identity is a wallet address from MetaMask rather than Supabase Auth, wallets are not mapped to `auth.uid()`. As a result:
  - Public tables (`profiles`, `posts`, `tips`, `follows`, `post_reactions`, `poll_votes`) can be **read directly from the browser** using the anon key (`src/frontend/lib/supabase-client.ts`) — fast, with no API route round-trip.
  - All **writes**, plus private tables (`messages`, `notifications`, `quests`), go through API routes using the service role key (`src/backend/lib/supabase-server.ts`), which bypasses RLS entirely.
  - For more granular RLS (e.g. a user reading only their own DMs directly from the browser), a custom JWT flow would be needed: the backend asks the user to sign a message via `personal_sign`, verifies the signature, then issues a Supabase token carrying a `wallet_address` claim used in a policy like `USING (wallet_address = auth.jwt() ->> 'wallet_address')`. This is not implemented yet — routing all writes through the service role is a reasonable starting point.

- **`src/app/api/tips/route.ts`** uses Next.js's `after()` so that on-chain transaction verification (`waitForTransactionReceipt`) keeps running to completion even after the response has already been sent — on Vercel, a serverless function can otherwise be torn down as soon as the response is flushed if the promise isn't awaited.

### 5. Wallet connection (MetaMask)

There's no dashboard to configure for the wallet side — `useTwoBlockAuth` talks directly to `window.ethereum` (the standard EIP-1193 interface) injected by the user's wallet extension:

- `login()` calls `eth_requestAccounts`, then automatically attempts to switch to the Arc network via `wallet_switchEthereumChain` (falling back to `wallet_addEthereumChain` if the wallet doesn't know the chain yet).
- If no wallet is detected at all, `login()` opens the MetaMask install page in a new tab.
- There is no embedded wallet — users without a wallet extension cannot log in. If onboarding non-crypto-native users is a goal, consider adding a separate provider (e.g. Privy, Dynamic) specifically for that path.

### 6. Deploy to Vercel

1. Import the repository at [vercel.com/new](https://vercel.com/new).
2. Framework preset: Next.js (auto-detected).
3. Add the environment variables (Project Settings → Environment Variables) — matching `.env.example` — for both **Production** and **Preview**.
4. `vercel.json` already extends the `maxDuration` of the `/api/tips` route to 30 seconds (needed by `after()` above). If your plan enforces a stricter function duration limit, check the current limits in the Vercel dashboard, or move transaction verification to a scheduled Supabase Edge Function (`pg_cron`) instead of running it inline in the API route.
5. Deploy.

---

## OG membership

OG is a single lifetime membership — $28 in USDC, paid once, no renewal, no expiry — purchased on-chain via `purchaseOG()` and sent to the TwoBlock treasury wallet:

| Tier | Daily posts | Max characters | Image uploads | Edit posts | Create polls | Gate posts |
|---|---|---|---|---|---|---|
| Free | 5 | 250 | ✅ | — | ✅ | — |
| OG | 20 | 10,000 | ✅ | ✅ (5 min) | ✅ | ✅ |

Pricing and benefits live in the `og_pricing` table (`supabase/migrations/0010_og_membership.sql`), enforced server-side on every write — the client-side `tier-limits.ts` cache exists purely for instant UI feedback. A wallet's membership timestamp is recorded as `og_member_since_block` — the block number of the confirmed `purchaseOG()` transaction, so it can't be backdated.

### Tip platform fee

Every tip sent through `tip()` now has a platform fee taken off the top and forwarded to `treasury`, alongside the OG membership payment:

| Sender tier | Fee |
|---|---|
| Free | 5% |
| OG | 2% |

The fee is computed on-chain (`FREE_TIP_FEE_BPS` / `OG_TIP_FEE_BPS` in `TwoBlockPayments.sol`) based on the sender's `isOG` status at send time, not the recipient's. The `Tipped` event now emits `fee` alongside `amount`, so `api/tips` can decode and store both — `amount_usdc` stays the gross amount the sender paid, `fee_usdc`/`net_amount_usdc` are the split (see `supabase/migrations/0011_tip_fees.sql`). The frontend tip modal (`TipButton.tsx`) shows the fee and net amount before the sender signs, using `splitTipAmount()` from `shared/contracts/two-block-payments.ts`.

---

## Why tips are a native transfer, not a smart contract

Arc uses USDC as the chain's **native gas currency** (18 decimals), rather than as an ERC-20 token like on most other EVM chains. That means sending a tip is a plain `sendTransaction({ to, value })` — no `approve()` step, and no token contract to deploy or interact with.

---

## Known limitations / roadmap

- Arc's official **mainnet** chain ID and RPC have not been publicly released yet; `arcMainnet` in `src/shared/chain.ts` is a placeholder. Do not set `NEXT_PUBLIC_ARC_NETWORK=mainnet` until those values are confirmed on Arc's official documentation.
- Granular, per-user RLS for private tables (e.g. direct messages readable straight from the browser) is not yet implemented — see the note on custom JWTs above.
- `public/logo-twoblock.svg` is a placeholder and can be swapped for final brand assets.

---

## License

This project is licensed under the MIT License — see [`LICENSE`](./LICENSE) for details.
