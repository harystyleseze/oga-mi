# AGENTS.md — Oga Mi

Guidance for AI coding agents working on this project.

## What this is

**Oga Mi** is an AI shopping assistant robot for [Good Online](https://good.online) — Nigeria's curated marketplace for 50+ local creators. Built on **Reachy Mini** + **0G decentralized stack** for the 0G Onsite Lagos Hackathon.

- **Path**: JS / Static Web App (zero build step)
- **API mode**: 0G Direct (per-provider `app-sk-...` keys)
- **Deployment**: HuggingFace Static Space — https://huggingface.co/spaces/devharystyles/oga-mi

## Files

| File | Purpose |
|------|---------|
| `index.html` | Complete app — UI, chat, voice, robot animations, 0G integration |
| `sim.js` | 3D Reachy Mini simulator (Three.js + URDF) — do not modify |
| `CLAUDE.md` | Claude Code-specific workflow |
| `AGENTS.md` | This file — portable agent guidance |
| `README.md` | Setup guide and feature docs |

## 0G Direct API

This project uses **0G Direct mode** — per-provider `app-sk-...` keys, not the Router.

| | Direct mode (this project) |
|---|---|
| Endpoint | `compute-network-N.integratenetwork.work/v1/proxy/...` |
| Key format | `app-sk-...` |
| Keys needed | One per provider (chat, whisper are separate) |
| Balance | Per-provider sub-accounts funded at pc.0g.ai |

### Endpoints used

- Chat: `POST https://compute-network-1.integratenetwork.work/v1/proxy/chat/completions`
- Whisper STT: `POST https://compute-network-16.integratenetwork.work/v1/proxy/audio/transcriptions`

### Why not Router mode?

The 0G Router (`router-api.0g.ai`, `sk-...` keys) is blocked by CORS from browsers. Direct mode endpoints support CORS and work from static web apps.

## SDK conventions

### Reachy Mini JS SDK
```html
import { ReachyMini } from "https://cdn.jsdelivr.net/gh/pollen-robotics/reachy_mini@v1.7.1/js/reachy-mini.js";
```
Always pin to a version tag. Never `@main`.

### Critical gotchas
1. **`ensureAwake()` after `startSession()`** — or motions silently fail
2. **Never call `getUserMedia()`** — robot streams via WebRTC
3. **Never call `robot.setMicMuted(false)`** — causes speaker loopback
4. **Whisper needs WAV** — `webmBlobToWav()` converts browser audio before sending
5. **Serve over HTTP** — `python3 -m http.server 8765` (not `file://`)
6. **OAuth only from `*.static.hf.space`** — use `?hf=<token>` for localhost

## Editing conventions
- Single-file app (`index.html`). Keep it single-file.
- Good catalog is in `GOOD_CATALOG` constant. Update products there.
- System prompt is in `buildSystemPrompt()`. Modify personality there.
- Robot animations are standalone `async function` blocks.
- CSS vars in `:root` at the top.

## References
- Reachy Mini SDK: github.com/pollen-robotics/reachy_mini
- 0G Docs: docs.0g.ai
- 0G Marketplace: pc.0g.ai
- Good Online: good.online
