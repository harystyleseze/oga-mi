# Oga Mi — AI Shopping Assistant for Good Online

[![Live Demo](https://img.shields.io/badge/Live%20Demo-HuggingFace%20Space-blue?logo=huggingface)](https://huggingface.co/spaces/devharystyles/oga-mi)
[![0G Hackathon](https://img.shields.io/badge/0G%20Onsite%20Lagos-Robotics%20%C3%97%20AI-green)](https://0g.ai)
[![Static Web App](https://img.shields.io/badge/App-Static%20HTML-orange)](https://devharystyles-oga-mi.static.hf.space/)

A Reachy Mini robot that serves as an AI-powered shopping assistant for [Good Online](https://good.online) — Nigeria's curated marketplace for local creators. Built on the 0G decentralized stack (compute, storage, chain).

---

## Live Demo

**[https://devharystyles-oga-mi.static.hf.space/](https://devharystyles-oga-mi.static.hf.space/)**

Open in any browser, enter your 0G API key, and start chatting with Oga Mi. No install needed — it's a static web app. You can use the built-in 3D robot simulator without any hardware.

---

## What it does

- **Chat** with a robot that knows the entire Good Online catalog (50+ creators, real prices in Naira)
- **Voice input** via 0G Whisper speech-to-text (push-to-talk)
- **Customer memory** — remembers returning visitors and preferences across sessions
- **On-chain receipts** — interaction logs minted to 0G Chain testnet (optional)
- **Expressive robot** — waves, nods, dances, thinks with head + antenna movements
- **3D simulator** — develop and demo without physical hardware

---

## 0G Stack

| Service | What | Endpoint |
|---------|------|----------|
| Compute (Chat) | GLM-5 FP8 / DeepSeek / Qwen | `compute-network-1.integratenetwork.work` |
| Compute (STT) | Whisper large-v3 | `compute-network-16.integratenetwork.work` |
| Storage | Customer profiles + chat history | localStorage (0G KV proxy) |
| Chain | Interaction receipts on-chain | 0G testnet · Chain ID 16602 · `evmrpc-testnet.0g.ai` |

**API mode: 0G Direct** — per-provider `app-sk-...` keys. The Router `sk-...` keys do NOT work from the browser (CORS blocked).

---

## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/harystyleseze/oga-mi
```

```bash
cd oga-mi
```

### 2. Start the local server

```bash
python3 -m http.server 8765
```

You should see:
```
Serving HTTP on :: port 8765 (http://[::]:8765/) ...
```

**Leave this terminal open. Do not close it — it's your server.**

### 3. Open in browser

```
http://localhost:8765
```

### 4. Configure and start

| Field | What to enter |
|-------|--------------|
| Your Name | Your name — Oga Mi greets you by name |
| Chat API Key | Your `app-sk-...` key (see below) |
| Chat Endpoint | `compute-network-1` (default) |
| Model | `GLM-5 FP8` (default) |
| Robot | `3D Simulator` for testing · `Live Robot` if hardware is connected |

Click **Start Oga Mi**.

### 5. Stop / restart

Press `Ctrl+C` in the server terminal to stop. To restart:

```bash
cd oga-mi && python3 -m http.server 8765
```

---

## Getting Your 0G API Keys (Direct Mode)

### Chat key (required)

1. Go to [pc.0g.ai](https://pc.0g.ai) and connect your wallet
2. **Switch to Advanced mode** (toggle at the top of the page)
3. Go to **Playground** → **AI Models**
4. Find `zai-org/GLM-5-FP8` → click **Use** → click **Fund** → deposit 1 0G
5. Go to **API Reference** for that provider → click to **mint a key** → copy the `app-sk-...` token

> Free testnet tokens: [faucet.0g.ai](https://faucet.0g.ai) — 0.1 0G/day

### Whisper key (optional — enables voice input)

Same flow but for the `openai/whisper-large-v3` provider (it's a separate sub-account). Its endpoint is `compute-network-16` and is pre-filled in the Advanced settings panel.

### Smoke test your key

```bash
curl -sS https://compute-network-1.integratenetwork.work/v1/proxy/chat/completions \
  -H "Authorization: Bearer YOUR_APP_SK_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"zai-org/GLM-5-FP8","messages":[{"role":"user","content":"hi"}],"max_tokens":5}'
```

200 + JSON = your key works.

---

## Configuration Reference

| Setting | Required | Default | Description |
|---------|----------|---------|-------------|
| Your Name | Yes | — | Used in greeting and stored in customer memory |
| Chat API Key | Yes | — | `app-sk-...` from pc.0g.ai Advanced mode |
| Chat Endpoint | Yes | `compute-network-1` | The compute-network host for your chat provider |
| Model | Yes | `zai-org/GLM-5-FP8` | LLM model identifier (must match provider) |
| Robot | Yes | `3D Simulator` | `3D Simulator` or `Live Robot` (WebRTC) |
| Whisper Key | No | — | `app-sk-...` for Whisper provider — enables voice |
| 0G Chain Key | No | — | Private key for logging receipts on 0G testnet |

All credentials are stored in `sessionStorage` only — never sent anywhere except the 0G endpoints you configure.

---

## Deploy to Hugging Face

The live app is already deployed at:
**[https://huggingface.co/spaces/devharystyles/oga-mi](https://huggingface.co/spaces/devharystyles/oga-mi)**

To deploy your own fork:

### 1. Create a Static Space

Go to [huggingface.co/new-space](https://huggingface.co/new-space):
- **SDK**: Static
- **Name**: `oga-mi` (or any name)
- **Visibility**: Public

### 2. Add a remote and push

```bash
git remote add hf https://huggingface.co/spaces/YOUR_HF_USERNAME/oga-mi
```

```bash
git push hf main
```

### 3. Your live app URL

```
https://YOUR_HF_USERNAME-oga-mi.static.hf.space/
```

> The HF Space README must have `sdk: static` and `app_file: index.html` in its YAML frontmatter. This repo's README does not include that frontmatter — add it when creating the Space's own README, or copy the format from the [deployed Space](https://huggingface.co/spaces/devharystyles/oga-mi/raw/main/README.md).

---

## Project Structure

```
oga-mi/
├── index.html   Complete app — UI, chat, voice, animations, all 0G integrations (single file, zero build)
├── sim.js       3D Reachy Mini simulator (Three.js + URDF loader)
├── AGENTS.md    Portable agent guidance (conventions for AI coding agents)
├── CLAUDE.md    Claude Code-specific workflow
└── README.md    This file
```

No build step. No npm. No bundler. All dependencies loaded via CDN.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Key verification failed — Failed to fetch" | You have a Router `sk-...` key. You need a Direct `app-sk-...` key from Advanced mode on pc.0g.ai |
| "Key verification failed — 400" | Wrong key for this endpoint — key must match the provider on the selected `compute-network` |
| Page won't load | Is the server running? Run `python3 -m http.server 8765` |
| Blank page | Open DevTools (F12) → Console tab — check for errors |
| Robot doesn't move | Make sure `3D Simulator` is selected in setup |
| Voice doesn't work | You need a separate Whisper `app-sk-...` key in the Advanced settings panel |
| Can't connect to Live Robot | Confirm you're on the same Wi-Fi as the robot; use the IP if `reachy-mini.local` doesn't resolve |
