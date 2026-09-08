# dgoui1: oui-1 (finetuned DiffusionGemma 26B-A4B), OpenUI format

Raw outputs of oui-1 on the 46 briefs, 4 runs each, generated with the exact
`protocols/openui/prompt.ts` system prompt bytes and scored by `score.ts`
like every other label here. Result: 132/184 complete.

oui-1 is a diffusion language model, so the serving configuration is part of
the protocol for this label. Every run in this directory was produced with:

- vLLM 0.24.0, one A100 80GB, bf16 weights quantized to FP8 at load
  (`--quantization fp8`; on A100 this is weight-only via the Marlin kernel),
  `--max-num-seqs 4`, `--max-model-len 16384`
- sampler settings from the checkpoint's `generation_config.json`: entropy-bound
  sampler (the only one vLLM 0.24 implements for DiffusionGemma), entropy bound
  0.1, **48 denoising steps** (the default), canvas length 256. The serve line
  below also passed `--hf-overrides` with `diffusion_max_denoising_steps: 64`;
  vLLM does not read those keys, so the effective cap was 48. Measured
  afterwards with `--diffusion-config`: 32 steps 134/184, 64 steps 126/184.
- thinking off (`enable_thinking` false, the chat template default)
- OpenAI-compatible chat completions, `max_tokens 8192` (the shared
  16,384-token ceiling in `run.ts` does not fit inside the model's 16k context
  together with the ~5k-token system prompt; no oui-1 output came within 4x of
  the 8,192 ceiling)
- `temperature 0.7` was sent, as for every model, but DiffusionGemma ignores
  per-request `temperature` and `seed`: vLLM applies the checkpoint's own
  schedule (t_max 0.8 annealing to t_min 0.4 over the denoising steps). Runs
  are not bit-reproducible; the four runs per brief are independent samples.

Serve line:

```
vllm serve <oui-1 weights> --trust-remote-code --max-model-len 16384 --quantization fp8 \
  --hf-overrides '{"diffusion_sampler":"entropy_bound","diffusion_entropy_bound":0.1,"diffusion_max_denoising_steps":64}' \
  --max-num-seqs 4 --port 8000
```

`dgbase` in this repo is the unmodified base model (the RedHatAI FP8-dynamic
checkpoint) under the same sampler, step and thinking settings. `dgoui1-a2-think` (local, not committed) is this model with
`enable_thinking` true (119/184; only 17 of 184 outputs produced a thought block).
