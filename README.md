# TwoBlock

**TwoBlock** is a decentralized, wallet-native social media platform built on the **Arc** blockchain. Instead of usernames and passwords, identity on TwoBlock *is* your crypto wallet — every post, tip, follow, and reaction is tied directly to an on-chain address. It combines the familiar feel of a modern social feed with Web3-native primitives: peer-to-peer USDC tipping, on-chain-verified transactions, tiered wallet verification, and gamified quests — all without requiring a centralized login system.

> Built with Next.js 14 (App Router), TypeScript, Supabase (Postgres + Row Level Security), and viem, deployed on Vercel.

---

## Why TwoBlock is a Web3 social app

| Traditional social media | TwoBlock |
|---|---|
| Email/password or OAuth login | **Wallet-based auth** — connect MetaMask (or any EIP-1193 wallet), no accounts or secrets to manage |
| Likes | On-chain-adjacent **Agree / Disagree** reactions tied to your wallet |
| "Buy me a coffee" via third-party payment processors | **Native USDC tipping** sent directly wallet-to-wallet on the Arc chain, with transaction hashes recorded and verified on-chain |
| Paid blue-check subscriptions via credit card | **Verification tiers purchased with on-chain USDC payments** to a treasury wallet, unlocking higher post quotas, image uploads, and polls |
| Centralized identity | No email required — your **wallet address is your identity**, with an optional on-chain-linked username |

Arc is used here specifically because it treats **USDC as its native gas currency**, which means tipping is a plain native transfer — no ERC-20 contracts, no `approve()` calls, no gas token swaps. This keeps the tipping UX as close to a single tap as Web3 currently allows.

---

## Core features

- **Wallet-native authentication** — connects to `window.ethereum` directly (MetaMask or any injected wallet), with automatic network switching/adding for the Arc chain. No embedded wallet, no third-party auth provider, no App ID.
- **Feed & posts** — text posts, image attachments, and reposts, with per-tier daily quotas and character limits.
- **On-chain polls** — Verified Max users can attach polls to posts; votes are open to every tier.
- **USDC tipping** — send USDC directly to another wallet from a post, with the transaction verified against the chain in the background before being marked as confirmed.
- **Verification tiers** — `Verified`, `Verified Pro`, and `Verified Max`, purchased with on-chain USDC payments to a dedicated treasury wallet. Higher tiers unlock larger post quotas, longer posts, image attachments, post editing, and poll creation.
- **Follows & profiles** — follow/unfollow, public profile pages per wallet, editable bio/avatar/username with a cooldown on username changes.
- **Reactions** — Agree/Disagree reactions on posts, feeding into notifications and quest progress.
- **Direct messages** — wallet-to-wallet messaging.
- **Notifications** — follows, reposts, tips, reactions, and poll results.
- **Quests** — lightweight gamification (first post, first tip sent, get verified, 7-day posting streak) to drive onboarding and engagement.
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

## Project structure

```
twoblock/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── profiles/onboard/route.ts     # Creates a profile on first wallet connect (username required)
│   │   │   ├── profiles/settings/route.ts    # Update bio/avatar/username
│   │   │   ├── profiles/sync/route.ts        # Sync/refresh profile state
│   │   │   ├── tips/route.ts                 # Records a tip and verifies the on-chain transaction
│   │   │   ├── posts/route.ts                # Create text/poll posts and reposts (quota + limits by tier)
│   │   │   ├── posts/[id]/vote/route.ts      # Vote on a poll (final; open to every tier)
│   │   │   ├── follows/route.ts              # Follow (POST) / unfollow (DELETE)
│   │   │   ├── reactions/route.ts            # Set (POST) / remove (DELETE) Agree/Disagree reactions
│   │   │   ├── messages/route.ts             # Direct messages
│   │   │   ├── notifications/route.ts        # Notifications feed
│   │   │   ├── quests/route.ts               # Quest progress
│   │   │   └── verification/purchase/route.ts# Records a verification tier purchase/renewal
│   │   ├── profile/[wallet]/page.tsx         # Public profile page for any wallet
│   │   ├── messages/                         # Direct message inbox and threads
│   │   ├── notifications/page.tsx
│   │   ├── quests/page.tsx
│   │   ├── search/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── verified/page.tsx                 # "Get Verified" purchase flow
│   │   ├── layout.tsx                        # Root layout — three-column shell (Sidebar / main / RightPanel)
│   │   ├── page.tsx                          # Home feed
│   │   └── providers.tsx                     # Global provider mount point
│   ├── components/                           # UI components (Feed, PostCard, PostComposer, modals, etc.)
│   ├── hooks/                                # Client hooks (auth, posts, follows, messages, quests, etc.)
│   └── lib/
│       ├── actions/sendTip.ts                # Sends USDC as a native transfer via viem WalletClient
│       ├── arc/chain.ts                      # Arc chain definitions (testnet + mainnet placeholder)
│       ├── verificationTreasury.ts           # Treasury wallet resolution
│       ├── quests.ts                         # Quest catalog + progress helpers
│       ├── tierLimits.ts                     # Client-side cache of per-tier quotas/limits
│       ├── types.ts                          # Shared domain types (Profile, Post, PostWithAuthor, ...)
│       ├── utils/                            # Formatting, linkify, upload helpers
│       └── supabase/
│           ├── client.ts                     # Browser client (anon key)
│           └── server.ts                     # Server client (service role key)
├── supabase/migrations/                      # Ordered SQL migrations (0001 → 0008)
├── public/                                   # Static assets (logo, icons)
├── .env.example
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── vercel.json
```

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

The project depends on two Web3/backend libraries used directly in the codebase:

- **`viem`** — Arc chain definition, transaction sending via a `WalletClient` wrapped around `window.ethereum`, address/unit helpers (`parseUnits`, `isAddress`, ...), and `waitForTransactionReceipt`.
- **`@supabase/supabase-js`** — browser client (anon key) and server client (service role key).

There is no third-party wallet SDK — wallet connection goes straight to MetaMask (or any other injected wallet) via `window.ethereum` (EIP-1193). See `src/hooks/useTwoBlockAuth.tsx` and `src/lib/actions/sendTip.ts`.

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
| `NEXT_PUBLIC_VERIFICATION_TREASURY_WALLET` | Arc wallet address that receives verification tier payments. |

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

   **Manual, via the SQL Editor:** run each file in `supabase/migrations/` in order, `0001` through `0008`, one at a time. **Do not skip `0005_storage_buckets.sql`** — it creates the `avatars` and `post-images` Storage buckets; without it, avatar/image uploads fail with a "Bucket not found" error.

3. Grab your credentials from **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

#### Why the data layer is structured this way

- **Row Level Security is enabled on every table** (`0003_rls_policies.sql`). Because TwoBlock's identity is a wallet address from MetaMask rather than Supabase Auth, wallets are not mapped to `auth.uid()`. As a result:
  - Public tables (`profiles`, `posts`, `tips`, `follows`, `post_reactions`, `poll_votes`) can be **read directly from the browser** using the anon key (`src/lib/supabase/client.ts`) — fast, with no API route round-trip.
  - All **writes**, plus private tables (`messages`, `notifications`, `quests`), go through API routes using the service role key (`src/lib/supabase/server.ts`), which bypasses RLS entirely.
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

## Verification tiers

Verification is purchased on-chain with USDC sent to the TwoBlock treasury wallet, and unlocks higher posting limits:

| Tier | Daily posts | Max characters | Image uploads | Edit posts | Create polls |
|---|---|---|---|---|---|
| Free | 1 | 60 | — | — | — |
| Verified | 2 | 150 | — | — | — |
| Verified Pro | 2 | 250 | ✅ | — | — |
| Verified Max | 3 | 350 | ✅ | ✅ | ✅ |

Pricing and benefits per tier live in the `verification_pricing` table (`supabase/migrations/0004_verification_pricing.sql`), read via `useVerificationPricing`, and enforced server-side on every write — the client-side `tierLimits.ts` cache exists purely for instant UI feedback.

---

## Why tips are a native transfer, not a smart contract

Arc uses USDC as the chain's **native gas currency** (18 decimals), rather than as an ERC-20 token like on most other EVM chains. That means sending a tip is a plain `sendTransaction({ to, value })` — no `approve()` step, and no token contract to deploy or interact with.

---

## Known limitations / roadmap

- Arc's official **mainnet** chain ID and RPC have not been publicly released yet; `arcMainnet` in `src/lib/arc/chain.ts` is a placeholder. Do not set `NEXT_PUBLIC_ARC_NETWORK=mainnet` until those values are confirmed on Arc's official documentation.
- Granular, per-user RLS for private tables (e.g. direct messages readable straight from the browser) is not yet implemented — see the note on custom JWTs above.
- `public/logo-twoblock.svg` is a placeholder and can be swapped for final brand assets.

---

## License

This project is licensed under the MIT License — see [`LICENSE`](./LICENSE) for details.
