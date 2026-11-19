# Piper TTS no navegador (voz neural local)

Arquivos de terceiros, fixados em versão e usados só quando a pessoa ativa a voz neural em "Estudo de Inglês".

| Arquivo | Origem | Licença |
|---|---|---|
| `piper-tts-web.js`, `piper-o91UDS6e.js` | `@mintplex-labs/piper-tts-web@1.0.4` (dist/) | MIT |
| `ort.min.js` | `onnxruntime-web@1.18.0` (dist/esm/ort.min.js) | MIT |

Alteração local em `piper-tts-web.js` (2 linhas, marcadas `dd:`): removido o singleton de sessão, porque a biblioteca
original reaproveitava o modelo da primeira voz ao trocar de idioma. Agora há uma sessão por voz.

Baixado só na hora do uso (nunca vai para o repositório):
- `piper_phonemize.wasm/.data` (espeak-ng, GPL-3) — cdn.jsdelivr.net, `@diffusionstudio/piper-wasm@1.0.0`
- `ort-wasm-simd.wasm` — cdnjs.cloudflare.com, onnxruntime-web 1.18.0
- modelos de voz `.onnx` (~60 MB cada) — huggingface.co, `diffusionstudio/piper-voices`

O texto lido nunca é enviado: a síntese roda no aparelho.
