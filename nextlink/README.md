# Nextlink frontend comparison

This branch adds a Nextlink UI frontend to LibreChat while retaining LibreChat conversation history, streaming, editing, and navigation. It connects to the existing Nextlink prototype backend through an authenticated OpenAI-compatible bridge. The original frontend remains available alongside it.

## Local services

| Service | Local URL | Responsibility |
| --- | --- | --- |
| Original workspace | http://127.0.0.1:3000 | Routing, company answers, MCP administration, PostgreSQL accounting |
| Bridge | http://127.0.0.1:3001 | OpenAI streaming adapter and conversation mapping |
| LibreChat | http://127.0.0.1:3080 | Login, conversations, frontend |
| MongoDB | 127.0.0.1:27019 | LibreChat persistence, isolated Docker volume |

This checkout lives at `nextgpt/librechat`. The companion code is in `nextgpt/server/librechat.js`, with setup/start/test scripts in `nextgpt/scripts`. From the companion workspace, run `npm run librechat:setup`, build this fork with `npm ci && npm run frontend`, start the original with `npm run live`, and start the comparison with `npm run librechat`. That command reuses running services. See the companion README for account creation. No credentials are committed here.

The server-only environment variables `NEXTLINK_BRIDGE_URL` and `NEXTLINK_LIBRECHAT_KEY` configure the connection. The same random integration key must be set in the companion `.env`; it is separate from provider credentials. These are deployment connection settings, not end-user policy switches. Public registration is disabled in the local setup. Both HTTP servers and MongoDB bind to loopback.

## Design and chat controls

`nextlink/registry` retains the public Nextlink UI 0.3.0 theme and button registry source from https://nxlink-ui.vercel.app. `librechat.yaml` maps those tokens to LibreChat's versioned semantic theme roles for light and dark appearance. `client/src/components/Nextlink/ui` adapts the Nextlink button and slot to those semantic roles. The fork uses the Nextlink logo and compact controls.

The chat panel exposes connector switches, pending tool arguments, Allow once / Always allow in this chat / Deny, tool results, grant revocation, and the actual routed model/cost. It uses authenticated `/api/nextlink` routes; the browser never receives the integration key. The proxy derives the user ID from LibreChat authentication. Connector administration links to the existing GUI.

Approvals and execution activity appear inline at the conversation tail. The panel follows the server-created conversation ID during the first streamed turn, before React Router has observed the new URL. Connector switches remain beside the composer. Activity shows routing, tool arguments/results/status, elapsed time, model calls, provider-reported input/output and reasoning tokens, and total estimated cost. Reasoning tokens are a subset of output tokens, not an additional charge. Provider-supplied reasoning summaries are shown only when present; the adapter does not fabricate thinking text. Currently enabled providers may not return a summary.

Approval expiry is distinct from Deny: after 90 seconds without a decision the tool does not run, and the result says approval timed out. Saved grants still apply only to the exact conversation/tool and are revocable in Connectors.

The backend selects models using the current routing settings. Full selected-branch text context is forwarded, so follow-ups and regenerated branches do not depend on the append-only execution mirror. MCP tool calls and accounting stay in the companion backend. A repeated question does not automatically authorize reuse.

## Comparison boundary

Text messages only. Attachments and native LibreChat tools, agents, web search, image generation, and scheduling are not enabled by this adapter. LibreChat requires MongoDB alongside the companion PostgreSQL database. Histories are separate; executions from either frontend feed the same backend analytics. The companion still has a fixed prototype identity, so this is not a production tenant-isolation solution.

## Verification

- `cd packages/api && npx jest src/nextlink/proxy.spec.ts --runInBand --coverage=false`
- `cd client && npx jest src/components/Nextlink/__tests__/Panel.spec.tsx --runInBand --coverage=false`
- Typecheck changed workspaces with `npx tsc --noEmit`.
- From the companion root: `npm run test:postgres` and `npm run librechat:test:live`.

The live test sends fictional text with chat connectors disabled and incurs model usage. Bridge/MCP tests use isolated fixtures and mocked external model responses. No production connector queries are needed for verification.

Local validation on 2026-10-02: production package/client builds passed, all three changed TypeScript workspaces passed, eight focused fork tests passed, and 48 companion backend tests passed. A live Jev-routed conversation streamed through Terra; its contextual follow-up used Luna. Chromium verified chat, reload, renaming, light/dark connector menus, and isolated first-turn tool approval, Allow once, Always allow across reload, Deny, connector disablement, and the 90-second unattended timeout. The client TypeScript wildcard path was removed because it reached into the parent companion's dependencies in this nested checkout.

Lighthouse was not run in this session: its harness drives Chrome through Playwright, while the active browser-control instructions require CUA. Browser checks above are functional verification, not a Lighthouse performance result. No PR review has been requested.

To reproduce the full-stack approval UI locally, run `node scripts/librechat-ui-fixture.mjs` from the companion root, then open http://localhost:3180. It uses a separate MongoDB database, an in-memory companion database, a real MCP fixture with fictional results, and deterministic model responses. It refuses external model/connector requests.
