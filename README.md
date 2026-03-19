# 💝 Proof of Kindness

> A decentralised gratitude and reputation protocol built on **Stellar Soroban** — where every act of kindness is immutably recorded on-chain and earns real, verifiable reputation.

[![CI](https://github.com/your-org/stellar-proof-of-kindnes/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/stellar-proof-of-kindnes/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🌟 Problem & Solution

**Problem:** Acts of kindness go unrecognised and unverified. Traditional reputation systems are centralised, opaque, and gameable.

**Solution:** Proof of Kindness lets anyone issue a cryptographically signed record of gratitude to another Stellar address. Recipients earn tiered reputation points that are publicly verifiable and permanently stored on the Stellar ledger.

---

## ✨ Features

- 🔐 **Auth-gated**: Only the stated issuer can create a record (Soroban auth)
- 📝 **On-chain messages**: 5–280 character immutable messages, forever
- 🏅 **Tiered badges**: Four badge levels, each awarding different reputation points
- 🛡️ **Self-kindness prevention**: Contract rejects self-referential acts
- 📊 **Public profiles**: Aggregate reputation score + issue/receive history
- ⚡ **Event emission**: Every act emits a Soroban event for indexers
- 📱 **Freighter Wallet**: First-class browser wallet integration

### Badge Tier Table

| Badge  | Emoji | Reputation Points |
|--------|-------|-------------------|
| Spark  | ⚡    | +5 pts            |
| Flame  | 🔥    | +15 pts           |
| Beacon | ⭐    | +50 pts           |
| Legend | 👑    | +100 pts          |

---

## 🏗️ Architecture

```
stellar-proof-of-kindnes/
├── Cargo.toml                          ← workspace root
├── contracts/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs                      ← contract entry points
│       ├── types.rs                    ← KindnessRecord, UserProfile, BadgeType
│       ├── errors.rs                   ← ContractError enum
│       ├── validation.rs               ← input safety guards
│       └── storage.rs                  ← persistent ledger storage layer
├── frontend/
│   └── src/
│       ├── pages/index.tsx             ← main dashboard
│       ├── components/
│       │   ├── IssueKindnessForm.tsx
│       │   └── KindnessCard.tsx
│       ├── hooks/
│       │   ├── useSorobanContract.ts
│       │   └── useFreighterWallet.ts
│       └── store/kindnessStore.ts
└── .github/workflows/ci.yml
```

---

## 🛠️ Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Blockchain | Stellar Soroban (WASM smart contract)|
| Language   | Rust + soroban-sdk v21              |
| Frontend   | Next.js 14, TypeScript              |
| Styling    | Vanilla CSS (glassmorphism + animations)|
| Wallet     | Freighter Browser Extension         |
| SDK        | @stellar/stellar-sdk v12            |
| State      | Zustand                             |
| CI/CD      | GitHub Actions                      |

---

## 🚀 Getting Started

### Prerequisites

- Rust (stable) + `wasm32-unknown-unknown` target
- `soroban-cli` v21
- Node.js 20+
- [Freighter wallet extension](https://freighter.app)

### 1. Clone and install

```bash
git clone https://github.com/your-org/stellar-proof-of-kindnes.git
cd stellar-proof-of-kindnes
```

### 2. Run contract tests

```bash
cd contracts
cargo test --features testutils
```

### 3. Build WASM

```bash
cargo build --target wasm32-unknown-unknown --release
```

### 4. Deploy to Testnet

```bash
# Fund a testnet account
soroban keys generate deployer --network testnet

# Deploy
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/proof_of_kindness.wasm \
  --network testnet \
  --source deployer
```

### 5. Run the frontend

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local and set NEXT_PUBLIC_CONTRACT_ID to your deployed contract ID
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 📘 Contract Interface

All functions exposed by `ProofOfKindnessContract`:

```rust
// Issue a new kindness act — requires issuer auth
issue_kindness(
    env:       Env,
    issuer:    Address,
    recipient: Address,
    message:   String,   // 5–280 chars
    badge:     BadgeType,
    category:  Symbol,
) -> Result<u64, ContractError>

// Fetch a single record by ID
get_record(env: Env, record_id: u64) -> Result<KindnessRecord, ContractError>

// List record IDs issued by an address
get_issued_by(env: Env, issuer: Address) -> Vec<u64>

// List record IDs received by an address
get_received_by(env: Env, recipient: Address) -> Vec<u64>

// Get reputation score for a user
get_reputation(env: Env, user: Address) -> u64

// Get aggregated profile (score + history lengths)
get_profile(env: Env, user: Address) -> UserProfile

// Get total number of records ever issued
total_records(env: Env) -> u64
```

---

## 🧪 Test Coverage

| # | Test Name                              | Assertion                             |
|---|----------------------------------------|---------------------------------------|
| 1 | `test_issue_kindness_success`          | First record ID == 1                  |
| 2 | `test_record_content_is_correct`       | issuer, recipient, badge, verified    |
| 3 | `test_reputation_increments_correctly` | Spark(5) + Flame(15) == 20            |
| 4 | `test_try_issue_self_kindness_fails`   | SelfKindnessNotAllowed error          |
| 5 | `test_try_issue_message_too_short_fails` | MessageTooShort error               |
| 6 | `test_try_get_nonexistent_record_fails`| RecordNotFound error                  |
| 7 | `test_issued_and_received_history`     | History lengths correct               |
| 8 | `test_profile_aggregates_correctly`    | Legend=100pts, total_received=1       |
| 9 | `test_total_records_counter`           | 0 before, 2 after two issues          |

Run all tests:

```bash
cd contracts && cargo test --features testutils
```

---

## 🗺️ Roadmap

1. **NFT Badges** — Mint SEP-0011 tokens for each badge tier on Stellar
2. **Endorsements** — Allow third parties to co-sign kindness records
3. **DAO Governance** — Let reputation holders vote on protocol upgrades
4. **Cross-chain bridge** — Mirror reputation scores to other blockchains
5. **Mobile app** — React Native companion with Freighter mobile
6. **Reputation decay** — Implement time-weighted reputation scoring

---

## 📄 License

MIT © 2024 — Feel free to use, fork, and contribute. Spread kindness! 💝
