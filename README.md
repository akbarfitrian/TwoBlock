TwoBlock is a decentralized, wallet-native social media platform built on the Arc blockchain. Instead of usernames and passwords, identity on TwoBlock is your crypto wallet. Every post, reaction, and transaction is directly tied to your wallet address.

Payments are processed through a single smart contract rather than peer-to-peer transfers. Tips and OG membership purchases are both routed through the TwoBlockPayments contract, ensuring transparency and security.

Built with Next.js 14 (App Router), TypeScript, Supabase (Postgres with Row Level Security), and viem, deployed on Vercel.

---

## Motivation: Why TwoBlock as a Web3 Social Platform

| Traditional Social Media | TwoBlock |
|---|---|
| Email/password or OAuth login | Wallet-based authentication. Connect MetaMask or any EIP-1193 compatible wallet with no accounts or secrets to manage |
| Likes | Agree and Disagree reactions directly tied to your wallet address |
| Third-party payment processors (Buy me a coffee) | Native USDC tipping sent directly wallet-to-wallet on Arc chain with transaction verification |
| Paid blue-check subscriptions via credit card | OG lifetime membership with a single $28 USDC on-chain payment to the treasury wallet |
| Centralized identity management | Wallet address is your identity with optional on-chain-linked username |

Arc is used because USDC is its native gas currency. This means tipping is a plain native transfer without ERC-20 contract interactions, approval calls, or gas token swaps.

---

## Core Features

- Wallet-native authentication connecting to window.ethereum directly via MetaMask or compatible wallets, with automatic network switching and chain addition for Arc
- Feed and posts with text content, image attachments, and reposts, subject to per-tier daily quotas and character limits
- On-chain polls where OG members can attach polls to posts with voting open to all users
- USDC tipping functionality enabling direct wallet-to-wallet transfers via the TwoBlockPayments contract tip function with backend transaction verification
- OG lifetime membership with a single $28 USDC purchase via the purchaseOG function, forwarding funds to the treasury wallet
- Follow and unfollow functionality with public profile pages per wallet and editable bio, avatar, and username with username change cooldown
- Agree and Disagree reactions on posts that feed into notifications and quest progress
- Direct wallet-to-wallet messaging capability
- Comprehensive notifications for follows, reposts, tips, reactions, and poll results
- Quest system with lightweight gamification including first post, first tip sent, OG acquisition, 7-day posting streak, and exclusive OG Gatekeeper quests
- Leaderboard displaying top-tipped posts and most-rewarded content

---

## Technology Stack

- Framework: Next.js 14 with App Router, TypeScript, Server Components, and API Routes
- Blockchain Layer: viem for chain definition, wallet client integration, native USDC transfers, and transaction receipt verification
- Blockchain Network: Arc, Circle's USDC-native EVM chain (currently targeting testnet)
- Wallet Integration: Direct browser wallet integration via EIP-1193 window.ethereum provider supporting MetaMask and compatible wallets
- Database: Supabase with PostgreSQL backend and Row Level Security enabled on all tables
- File Storage: Supabase Storage for avatar and post image management
- Styling: Tailwind CSS for responsive design
- Deployment: Vercel for hosting and deployment

---

## Language Composition

The project utilizes multiple programming languages:
- TypeScript: 89.2 percent - Core framework and application logic
- PLpgSQL: 6.4 percent - Database migrations and stored procedures
- Solidity: 3.3 percent - Smart contract implementation
- Other: 1.1 percent - Configuration and miscellaneous files

---

## Smart Contract Architecture (TwoBlockPayments.sol)

Both payment flows, tips and OG membership purchases, are processed through a single deployed smart contract instead of raw peer-to-peer transfers.

```
contracts/
├── TwoBlockPayments.sol       # Primary smart contract
└── scripts/deploy.ts          # Hardhat deployment script
hardhat.config.ts              # Contract compilation targeting Arc testnet and mainnet
```

Contract routing ensures transaction transparency through event emission and treasury wallet flexibility for fund forwarding.

Core Functions:

| Function | Called From | Purpose |
|---|---|---|
| tip(address to, string postId) | src/backend/lib/send-tip.ts | Forwards msg.value to recipient and emits Tipped event |
| purchaseOG() | src/frontend/hooks/useOG.ts | Forwards msg.value to treasury and sets OG status |
| withdraw() | User initiated | Recovers escrowed funds from failed transfers |
| setTreasury(address) | Contract owner | Updates treasury wallet address for OG payments |

---

## Project Structure

The codebase is organized into frontend, backend, and shared modules under src/. The src/app/ directory remains at the top level to comply with Next.js App Router requirements.

```
twoblock/
├── src/
│   ├── app/                                   # Next.js App Router
│   │   ├── api/                                # Backend HTTP routes
│   │   │   ├── profiles/onboard/route.ts       # Profile creation on first wallet connection
│   │   │   ├── profiles/settings/route.ts      # Profile updates
│   │   │   ├── tips/route.ts                   # Tip recording and verification
│   │   │   ├── posts/route.ts                  # Post creation with quota enforcement
│   │   │   ├── posts/[id]/route.ts             # Post editing functionality
│   │   │   ├── posts/[id]/vote/route.ts        # Poll voting
│   │   │   ├── follows/route.ts                # Follow and unfollow operations
│   │   │   ├── reactions/route.ts              # Agree/Disagree reaction management
│   │   │   ├── messages/route.ts               # Direct messaging
│   │   │   ├── notifications/route.ts          # Notification feed
│   │   │   ├── quests/route.ts                 # Quest progress tracking
│   │   │   └── og/purchase/route.ts            # OG membership purchase recording
│   │   ├── profile/[wallet]/page.tsx           # Public wallet profile pages
│   │   ├── messages/                           # Direct message interface
│   │   ├── notifications/page.tsx              # Notification display
│   │   ├── quests/page.tsx                     # Quest interface
│   │   ├── search/page.tsx                     # Search functionality
│   │   ├── settings/page.tsx                   # User settings
│   │   ├── og/page.tsx                         # OG membership purchase flow
│   │   ├── layout.tsx                          # Root layout
│   │   ├── page.tsx                            # Home feed
│   │   └── providers.tsx                       # Global provider configuration
│   │
│   ├── frontend/                              # Client-side only modules
│   │   ├── components/                         # React UI components
│   │   ├── hooks/                              # Custom React hooks
│   │   └── lib/                                # Frontend utilities
│   │
│   ├── backend/                               # Server-side only modules
│   │   └── lib/                                # Backend utilities
│   │
│   ├── shared/                                # Shared frontend and backend modules
│   │   ├── types.ts                            # Type definitions
│   │   ├── tier-limits.ts                      # Tier-based quotas and limits
│   │   ├── quests.ts                           # Quest definitions
│   │   ├── chain.ts                            # Chain configuration
│   │   └── contracts/                          # Contract ABIs and utilities
│   │
│   └── types/                                 # TypeScript type declarations
│
├── contracts/                                 # Solidity smart contracts
├── supabase/migrations/                       # Database migrations
├── public/                                    # Static assets
├── .env.example                               # Environment template
├── hardhat.config.ts                          # Hardhat configuration
├── next.config.js                             # Next.js configuration
├── tailwind.config.js                         # Tailwind CSS configuration
├── tsconfig.json                              # TypeScript configuration
├── package.json                               # Dependencies
└── vercel.json                                # Vercel configuration
```

Import Alias: @/* maps to src/* enabling clean import paths throughout the codebase.

---

## Getting Started

### Prerequisites

Node.js 18 or higher and npm or yarn package manager.

### Installation and Setup

1. Clone the repository and install dependencies:

```bash
git clone https://github.com/akbarfitrian/TwoBlock.git
cd twoblock
npm install
```

2. Configure environment variables:

```bash
cp .env.example .env.local
```

Complete the following environment variables:

| Variable | Description |
|---|---|
| NEXT_PUBLIC_ARC_NETWORK | Network selection: testnet or mainnet |
| NEXT_PUBLIC_ARC_RPC_URL | Optional dedicated RPC endpoint for Arc testnet |
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anonymous key for client-side operations |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key for server-side operations (keep confidential) |
| NEXT_PUBLIC_OG_TREASURY_WALLET | Arc wallet address designated to receive OG membership payments |

3. Start the development server:

```bash
npm run dev
```

Access the application at http://localhost:3000 where you will see a Connect Wallet button.

### Database Configuration

1. Create a new Supabase project at supabase.com/dashboard

2. Apply database migrations:

Using Supabase CLI (recommended):
```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

Or manually execute migration files from supabase/migrations/ in sequential order via the Supabase SQL Editor.

3. Retrieve and store credentials from Project Settings → API:
   - Project URL for NEXT_PUBLIC_SUPABASE_URL
   - Anon public key for NEXT_PUBLIC_SUPABASE_ANON_KEY
   - Service role key for SUPABASE_SERVICE_ROLE_KEY

### Production Deployment

1. Import the repository at vercel.com/new

2. Select Next.js as the framework (auto-detected)

3. Configure environment variables in Project Settings for both Production and Preview environments

4. Deploy the application

---

## OG Membership System

OG represents a single lifetime membership purchased with a one-time $28 USDC payment processed on-chain through the purchaseOG function with no subscription renewal or expiration.

Tier Comparison:

| Tier | Daily Post Limit | Maximum Characters | Image Upload | Post Editing | Poll Creation | Post Gating |
|---|---|---|---|---|---|---|
| Free | 5 posts | 250 characters | Available | Not available | Available | Not available |
| OG | 20 posts | 10,000 characters | Available | Available (5 minute window) | Available | Available |

### Platform Fee Structure

A platform fee is deducted from each tip and forwarded to the treasury alongside OG membership payments:

| Sender Tier | Platform Fee |
|---|---|
| Free tier user | 5 percent |
| OG member | 2 percent |

The fee is calculated on-chain based on the sender's OG status at the time of transfer. The Tipped event includes fee information for verification.

---

## Technical Architecture Notes

### Why Tips Use Native Transfers

Arc implements USDC as its native gas currency with 18 decimal places rather than as a standard ERC-20 token. This architectural choice enables tips to function as plain value transfers without requiring ERC-20 contract interactions or gas token management.

### Data Layer Architecture

Row Level Security is enabled on all database tables providing security without reliance on Supabase Auth.

Public tables including profiles, posts, tips, follows, post reactions, and poll votes are directly readable from the browser using the anonymous key.

All write operations and private tables including messages, notifications, and quests are processed through API routes using the service role key, which bypasses RLS restrictions on the server.

---

## Known Limitations

- Arc's official mainnet chain ID and RPC endpoint have not been publicly released. Do not configure NEXT_PUBLIC_ARC_NETWORK=mainnet until official specifications are available.
- Per-user Row Level Security for private tables enabling direct browser access to direct messages is not yet implemented.
- Logo assets in public/logo-twoblock.svg are placeholder files suitable for replacement with final brand materials.

---

## Development Commands

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint checks
npm run contracts:compile # Compile Solidity contracts
npm run contracts:deploy:testnet  # Deploy to Arc testnet
npm run contracts:deploy:mainnet  # Deploy to Arc mainnet
```

---

## License

This project is licensed under the MIT License. See LICENSE file for complete license text.