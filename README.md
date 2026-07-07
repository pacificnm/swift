# Swift (local checkout)

Personal **project management**, **knowledge hub**, and **AI assistant** for Nest.

**Specs and plans** (versioned in the Nest repo): [docs/README.md](docs/README.md)

This directory is **gitignored** by the Nest framework repo except `docs/`. Treat it as your local product checkout.

## Layout

```text
apps/swift/
├── docs/               # specs + plans (tracked in nest repo)
├── ui/                 # React + TypeScript + Tailwind
├── src-tauri/          # Tauri + nest-tauri
├── crates/             # swift-data, swift-agent-tools (phase 1+)
├── config.example.toml
└── .cargo/config.toml  # Nest path patches
```

## Prerequisites

- Node.js 20+
- Rust 1.75+
- Linux: Tauri system deps (`libwebkit2gtk-4.1-dev`, etc.) — see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)
- **Remote** PostgreSQL 15+ with **pgvector** on your server (phase 1+)
- **Ollama** on server for chat and embeddings (`ollama pull nomic-embed-text`)
- Network access to server (e.g. `server.lan`)

## First run

From `apps/swift/`:

```bash
cp config.example.toml config.toml
cp mcp.example.json mcp.json   # optional; only if [agent.mcp] enabled = true
# edit config.toml as needed

cd ui
npm install
npm run tauri:dev    # runs Tauri from apps/swift/ (finds src-tauri/)
```

Or run UI and shell separately:

```bash
cd ui && npm install && npm run dev
# separate terminal:
cd src-tauri && cargo run
```

## Build

```bash
cd ui
npm run build          # TypeScript + Vite
npm run tauri:build    # production bundle
```

```bash
cd src-tauri
cargo check            # Rust only (no webview)
```

## Nest crates

Path patches in [`.cargo/config.toml`](.cargo/config.toml) and [`src-tauri/Cargo.toml`](src-tauri/Cargo.toml) point at `../../core/crates/` and `../../modules/crates/` in the monorepo.

## Related

- [swift-v1 plan](docs/plan/swift-v1.md)
- [swift-scaffold-v1](docs/plan/swift-scaffold-v1.md)
- [Desktop template](../../templates/desktop/)
