# dgbase: DiffusionGemma 26B-A4B-it, unmodified, OpenUI format

Raw outputs of the base model on the 46 briefs, 4 runs each, exact
`protocols/openui/prompt.ts` system prompt bytes, scored by `score.ts`.
Result: 24/184 complete.

DiffusionGemma is a diffusion language model, so the serving configuration is
part of the protocol for this label:

- vLLM 0.24.0, one A100 80GB, checkpoint
  `RedHatAI/diffusiongemma-26B-A4B-it-FP8-dynamic` (FP8 weights; on A100 the
  Marlin weight-only path), `--max-num-seqs 4`, `--max-model-len 16384`
- sampler settings from the checkpoint's `generation_config.json`: entropy-bound
  sampler, entropy bound 0.1, 48 denoising steps (the default), canvas length 256
  (the `--hf-overrides` diffusion keys in the serve line are not read by vLLM)
- thinking off (`--default-chat-template-kwargs '{"enable_thinking": false}'`)
- OpenAI-compatible chat completions, `max_tokens 8192`
- `temperature 0.7` was sent but DiffusionGemma ignores per-request
  `temperature` and `seed` (vLLM applies the checkpoint's own 0.8 to 0.4
  schedule); runs are independent samples, not bit-reproducible

Serve line:

```
vllm serve RedHatAI/diffusiongemma-26B-A4B-it-FP8-dynamic --trust-remote-code \
  --max-num-seqs 4 --max-model-len 16384 --gpu-memory-utilization 0.92 \
  --hf-overrides '{"diffusion_sampler": "entropy_bound", "diffusion_entropy_bound": 0.1}' \
  --default-chat-template-kwargs '{"enable_thinking": false}'
```

`truncated.json` lists the runs that hit the output ceiling.

At this score level the board is close to its floor: no brief completes on all
4 runs, 30 of 46 briefs complete on none, and the 24 completions are scattered
over 16 briefs. Treat differences of a few points against this row as noise.
