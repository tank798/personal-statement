# Statement Margin

This repo now has two layers:

- `docs/`: public GitHub Pages prototype
- `app/`: full-stack local MVP for real file parsing and AI review

## Public prototype

The GitHub Pages site publishes the static prototype in `docs/`.

## Full-stack local app

The local app reads drafts, loads private templates from `templates/`, applies the house rules in `references/`, and returns a review UI with redlines plus margin comments.

### Run locally

1. Open a terminal in `app/`
2. Install dependencies with `npm install`
3. Copy `.env.example` to `.env`
4. Add `OPENAI_API_KEY`
5. Set `OPENAI_MODEL` if you want to override the default
6. Optionally set `OPENAI_BASE_URL` if you want to use an OpenAI-compatible non-OpenAI endpoint
7. Run `npm run dev`
8. Open `http://localhost:3000`

Without `OPENAI_API_KEY`, the app falls back to a local mock review mode so you can still test the workflow.

### Private materials

Keep approved sample statements and incoming drafts out of the public site:

- `templates/`
- `incoming/`
- `outputs/`

These folders are already ignored by Git.

## Notes on model choice

The app defaults to `gpt-5-mini` for lower latency and cost, but you can override `OPENAI_MODEL` in `app/.env`. OpenAI's current model guidance says to start with `gpt-5.4` if you're not sure and use `gpt-5-mini` when you want lower latency and cost.