# Agents.md

## Git

- Commit messages are ALWAYS written in English, no exceptions — regardless of the language the task was discussed in. Same for branch names and PR titles/descriptions.

## This fork

- Base: OpenCut classic's last version (`OpenCut-app/opencut-classic`, archived 2026-05-17, storage schema v31; remote `classic`), not upstream `OpenCut-app/OpenCut`, whose `main` is a from-scratch rewrite with no editor yet: never merge or rebase from `upstream`.
- On top, the fork's own features: zoom segments (`timeline/zoom-segments.ts`, the zoom lane, the region picker, Z), Reels and Shorts safe-zone guides, a fader per track, freeze frame, coloured text runs (`text/runs.ts`) and a text background outline, alpha video, boundary keyframes kept in step across splits, the bundled sound library. Plus fixes to classic itself: the storage migrations, sticker registration, new default shortcuts for existing users.
- `apps/web/public/sounds` is kept out of git, because some of its files may not be published (its `CREDITS.txt`). This machine has the only copy.
- The chatgpt-pro-tools `opencut-montage` skill injects schema-v25 projects into `.claude-profile` on :3100, and the migrations bring them to v31 on open.

## Architecture

An ongoing migration is moving all business logic into `rust/`. Each app under `apps/` is a UI shell — it owns rendering, interaction, and platform-specific concerns, but never owns logic. The UI framework for any given app is a replaceable detail.

### `rust/`

The single source of truth for all non-UI code. Everything platform-agnostic belongs here: no components, no hooks, no framework imports.

### `apps/`

Each app is a frontend that calls into Rust. Logic is never duplicated between apps — only UI is, because each platform may use an entirely different framework and language to build it.

- `web/` — Next.js
- `desktop/` — GPUI

## Web

### React

- Read components before using them. They may already apply classes, which affects what you need to pass and how to override them.

