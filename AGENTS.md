<!-- agents:from-facts:start -->
<!-- authored by agents-md-facts — from your repo's facts, never guessed · re-run to refresh -->

# AGENTS.md — faf-server-card-ref

JavaScript · library · Node.js · npm package manager · v1.0.0

## Setup & build

```bash
npm install    # install dependencies
npm run dev    # dev
```

## Run the tests

```bash
npm run test
```

## Where things live

- `package.json`
- `src/index.js`
- `test/`
- `examples/`
- `README.md`

## Conventions

- ESM modules (`type: module`)

## Guardrails

- **Always OK:** read files, run the tests (`npm run test`).
- **Ask first:** dependency installs, deletions, migrations / schema changes.
- **Never:** force-push, push to `main`, commit secrets.

## Definition of Done

Done when: `npm run test` passes · committed with a clear message.

## Commit & PR

- Write a clear, descriptive commit message.
- Branch off `main`; never commit to `main` directly — open a PR for review.
- If build/test scripts or layout change, refresh this file in the **same PR** (`npx agents-md-facts`).
<!-- agents:from-facts:end -->
