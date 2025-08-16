# ListBlock

A Stacks-based compliance and watchlist system scaffolded for Clarinet-driven smart contracts and Vitest-based simulation tests.

This repository currently provides the development harness (Clarinet, Vitest environment, and network settings). Business contracts and tests are intentionally not yet implemented.

## Table of contents

- Overview
- Features
- Architecture
- Tech stack
- Repository layout
- Prerequisites
- Setup
- Usage
- Testing
- Network configuration
- VS Code tasks
- Troubleshooting
- Roadmap
- Contributing
- License

## Overview

ListBlock aims to maintain authoritative sanctions and watchlists on Stacks. It enables near real-time updates and auditable governance over on-chain list entries.

The current repo includes:
- Clarinet project configuration and local Devnet/Testnet/Mainnet settings.
- Vitest configuration for Clarinet Simnet testing.
- Project scaffolding ready for adding Clarity contracts and tests.

Refer to `ListBlock.md` for the high-level intent and non-chain components envisioned for the broader system.

## Features

- Clarinet-powered workflow for Clarity contracts (check, REPL, devnet integration).
- Vitest test environment with `vitest-environment-clarinet` pre-wired.
- Devnet with sample accounts for local experimentation.
- Testnet/Mainnet settings files (mnemonics intentionally omitted) for future deployments.

## Architecture

Planned high-level architecture (from `ListBlock.md`):
- On-chain: Clarity contracts governing list entries, expirations, and multi-party updates.
- Off-chain services: Ingestion and analytics pipelines (e.g., Django/Python, Rust diff engine) for transforming official lists into on-chain updates.
- Front-end: A console for review/approvals (e.g., Vue + Stacks.js).

This repository focuses on the on-chain contract workspace and simulation testing. Off-chain and front-end components are out of scope here.

## Tech stack

- Clarity smart contracts (via Clarinet)
- Clarinet SDK and Simnet (`@hirosystems/clarinet-sdk`)
- Vitest + `vitest-environment-clarinet` for testing
- Node.js scripts for test orchestration

## Repository layout

- `Clarinet.toml` — Clarinet project manifest and analyzer settings.
- `contracts/` — Clarity contracts (empty; add your `.clar` files here).
- `tests/` — Vitest test files (empty; add your `*.test.ts` here).
- `settings/Devnet.toml` — Local Devnet configuration and funded sample accounts.
- `settings/Testnet.toml` — Testnet RPC and deployer placeholder (do not commit secrets).
- `settings/Mainnet.toml` — Mainnet RPC and deployer placeholder (do not commit secrets).
- `vitest.config.js` — Vitest + Clarinet environment configuration.
- `tsconfig.json` — TypeScript configuration for tests and helpers.
- `package.json` — Test scripts and dependencies.
- `ListBlock.md` — Product overview/vision.

## Prerequisites

- Node.js 18+ and npm
- Clarinet CLI (install from release binaries or via Rust toolchain)
- Docker (recommended for running a full Devnet stack via Clarinet where needed)

Optional installation hints (choose one approach):
- From release binaries: see the official Clarinet releases page and add the binary to PATH.
- With Rust installed: `cargo install clarinet`.

## Setup

Install Node dependencies:

```powershell
npm install
```

Verify Clarinet is available:

```powershell
clarinet --version
```

## Usage

Check contracts and static analysis:

```powershell
clarinet check
```

Open a Clarinet REPL (Simnet):

```powershell
clarinet console
```

Optionally start a local Devnet using the provided settings (refer to Clarinet docs for the preferred command in your version):

```powershell
# Example only; consult your Clarinet version for the exact devnet command
# Many workflows use `clarinet integrate` or `clarinet devnet start`
# If supported:
# clarinet devnet start --config ./settings/Devnet.toml
```

## Testing

Vitest is configured to run with the Clarinet Simnet through `vitest-environment-clarinet`. Common scripts:

- Run tests once:

```powershell
npm test
```

- Run tests with coverage and cost reports:

```powershell
npm run test:report
```

- Watch tests and re-run on changes (contracts and tests):

```powershell
npm run test:watch
```

Add tests under `tests/` (TypeScript). The environment exposes a global Simnet instance for deploying and calling contracts. See `vitest.config.js` for how `vitestSetupFilePath` and `getClarinetVitestsArgv()` provide coverage and cost collection.

## Network configuration

- Devnet: `settings/Devnet.toml` contains multiple funded accounts for local development. These mnemonics are for local use only; do not reuse on public networks.
- Testnet/Mainnet: `settings/Testnet.toml` and `settings/Mainnet.toml` include RPC endpoints and a placeholder deployer mnemonic. Do not commit real mnemonics; `.gitignore` is configured to exclude these files.

To target a specific manifest or pass coverage/cost flags to tests, see comments in `vitest.config.js` and use the `--` argument passthrough when invoking Vitest.

## VS Code tasks

This workspace defines helpful tasks:

- Check contracts: runs `clarinet check`.
- npm test: runs `npm test` using Vitest.

Use the VS Code Run Task UI to execute them.

## Troubleshooting

- Clarinet not found: ensure it’s installed and on PATH. Check with `clarinet --version`.
- No tests found: this scaffold ships with an empty `tests/` directory. Add `*.test.ts` files.
- Costs/coverage not generated: ensure you’re using `npm run test:report` and that your Clarity contracts and tests exercise code paths.
- Devnet issues: confirm Docker is running if your Clarinet version relies on containerized services for Devnet. Verify the ports in `settings/Devnet.toml` are available.

## Roadmap

- Add core Clarity contracts for list entry storage, governance, and expiration.
- Implement end-to-end simulation tests with Vitest and Simnet.
- Provide deployment and migration scripts for Testnet/Mainnet.
- Add CI for contract checks and tests (including costs/coverage reports).
- Extend documentation with example transactions and API shapes.

## Contributing

1. Fork the repository and create a feature branch.
2. Add or update contracts under `contracts/` and tests under `tests/`.
3. Run `clarinet check` and `npm test` locally.
4. Open a pull request with a clear description and any relevant context.

## License

This project is licensed under the ISC License (see `package.json`).
