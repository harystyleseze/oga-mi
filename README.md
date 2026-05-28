---
title: Oga Mi
emoji: 🤖
colorFrom: green
colorTo: yellow
sdk: static
pinned: false
tags:
  - 0g-hackathon
---

# Oga Mi — AI Shopping Assistant for Good Online

A Reachy Mini robot that serves as an AI-powered shopping assistant for [Good Online](https://good.online) — Nigeria's curated marketplace for local creators. Built on the 0G decentralized stack.

---

## How to Run (Step by Step)

### Step 1: Open your terminal

On macOS: press `Cmd + Space`, type `Terminal`, press Enter.

### Step 2: Navigate to the project

```bash
cd /Users/mac/OG/ogami
```

### Step 3: Start the local server

```bash
python3 -m http.server 8765
```

You should see:
```
Serving HTTP on :: port 8765 (http://[::]:8765/) ...
```

**Leave this terminal open. Do not close it — it's your server.**

### Step 4: Open in browser

Open Chrome or Safari and go to:
```
http://localhost:8765
```

### Step 5: Configure and start

1. **Your Name** — enter your name (Oga Mi will greet you by name)
2. **Chat API Key** — paste your `app-sk-...` key (see "Getting API Keys" below)
3. **Chat Endpoint** — leave as `compute-network-1` (default)
4. **Model** — leave as `GLM-5 FP8` (default)
5. **Robot** — select `3D Simulator` for testing (or `Live Robot` if hardware is connected)
6. Click **Start Oga Mi**

### To stop the server

Press `Ctrl + C` in the terminal where the server is running.

### To restart after stopping

```bash
cd /Users/mac/OG/ogami && python3 -m http.server 8765
```

---

## Getting Your 0G API Keys (Direct Mode)

The app uses 0G Direct mode — per-provider `app-sk-...` keys. The Router `sk-...` keys do NOT work from the browser (CORS blocked).

### Chat key (required)

1. Go to [pc.0g.ai](https://pc.0g.ai) and connect your wallet
2. **Switch to Advanced mode** (toggle at the top of the page)
3. Go to **Playground** → browse **AI Models**
4. Find `zai-org/GLM-5-FP8` → click **Use** → click **Fund** → deposit 1 0G
5. Go to **API Reference** section for that provider
6. Click to **mint a key** → you get `app-sk-...`
7. Copy it — this is your **Chat API Key**

> Free testnet tokens: [faucet.0g.ai](https://faucet.0g.ai) (0.1 0G/day)

### Whisper key (optional — enables voice)

Same flow but for `openai/whisper-large-v3`:
1. Fund the whisper provider separately (it's a different provider)
2. Mint its own `app-sk-...` key
3. Paste in **Advanced** → **Whisper API Key**
4. Its endpoint is `compute-network-16` (pre-configured)

### Smoke test your key (optional)

```bash
curl -sS https://compute-network-1.integratenetwork.work/v1/proxy/chat/completions \
  -H "Authorization: Bearer YOUR_APP_SK_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"zai-org/GLM-5-FP8","messages":[{"role":"user","content":"hi"}],"max_tokens":5}'
```

200 + JSON = your key works.

---

## 0G Integration

| Service | What | Endpoint |
|---------|------|----------|
| Compute (Chat) | GLM-5 / DeepSeek / Qwen | `compute-network-1.integratenetwork.work` |
| Compute (STT) | Whisper large-v3 | `compute-network-16.integratenetwork.work` |
| Storage | Customer profiles + history | localStorage (0G KV proxy) |
| Chain | Interaction receipts | 0G testnet (Chain ID 16602) |

---

## Publish to Hugging Face

### Step 1: Create a Static Space

Go to [huggingface.co/new-space](https://huggingface.co/new-space):
- **SDK**: Static
- **Name**: `oga-mi`
- **Visibility**: Public

### Step 2: Push your code

```bash
cd /Users/mac/OG/ogami
git add index.html sim.js README.md CLAUDE.md AGENTS.md .gitignore
git commit -m "Oga Mi: AI shopping assistant for Good Online"
git remote add hf https://huggingface.co/spaces/YOUR_USERNAME/oga-mi
git push hf main
```

Replace `YOUR_USERNAME` with your HuggingFace username.

### Step 3: Access your live app

Your app is at: `https://YOUR_USERNAME-oga-mi.static.hf.space/`

---

## Features

- **Chat** with a robot that knows the entire Good Online catalog (50+ creators, real prices)
- **Voice input** via 0G Whisper speech-to-text
- **Customer memory** — remembers returning visitors and preferences
- **On-chain receipts** — interaction logs on 0G Chain testnet
- **Expressive robot** — waves, nods, dances, thinks with head + antenna movements
- **3D simulator** — develop without hardware

## Files

- `index.html` — Complete app (single file, zero build step)
- `sim.js` — 3D Reachy Mini simulator
- `CLAUDE.md` — Claude Code project instructions
- `AGENTS.md` — Portable agent guidance
- `README.md` — This file

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Key verification failed — Failed to fetch" | You're using a Router `sk-...` key. You need a Direct `app-sk-...` key from Advanced mode on pc.0g.ai |
| "Key verification failed — 400" | Wrong key for this endpoint. Make sure the key matches the provider on the selected compute-network |
| Page won't load | Is the server running? Run `python3 -m http.server 8765` in terminal |
| Blank page | Open browser DevTools (F12) → Console tab → check for errors |
| Robot doesn't move | Make sure you selected 3D Simulator in setup |
| Voice doesn't work | You need a separate Whisper `app-sk-...` key in Advanced settings |

## Built for

0G Onsite Lagos Hackathon (May 27-28, 2026) — Robotics x AI Track
