# CLAUDE.md — Oga Mi

@AGENTS.md

## Claude Code workflow

1. Edit `index.html` directly — single file, no build step
2. Serve: `python3 -m http.server 8765`
3. Test: http://localhost:8765 — refresh after edits
4. Sim mode works without hardware

## Quick nav (index.html)

| Feature | Where |
|---------|-------|
| CSS theme | `:root` near top |
| Setup form | `#setup` div |
| Good catalog | `GOOD_CATALOG` constant |
| System prompt | `buildSystemPrompt()` |
| App startup | `startApp()` |
| 0G Chain | `initChain()`, `logOnChain()` |
| Chat API | `askAI()` |
| Whisper STT | `transcribe()`, `webmBlobToWav()` |
| Mic recording | `startRecording()` |
| Message flow | `sendMessage()` |
| Animations | `doWave()`, `doNod()`, `doDance()`, etc. |

## Smoke test keys

```bash
curl -sS https://router-api.0g.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-YOUR_KEY" \
  -d '{"model":"zai-org/GLM-5-FP8","messages":[{"role":"user","content":"hi"}],"max_tokens":5}'
```

## Adding features

**New animation:** Add `window.doX = async function() {...}` following existing pattern. Return head/antennas to neutral at end.

**New LLM action:** Add `[ACTION:x]` to system prompt in `buildSystemPrompt()`, add to `fireAction()` map.

**New 0G service:** Add config in setup form, include in `CFG` object, activate `.og-chip`.
