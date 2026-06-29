# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Dev server at http://localhost:5173
npm run build    # Production build (run before finishing any task)
npm run preview  # Preview production build locally
```

There is no test suite. Validate changes by running `npm run build` and reviewing visually.

## Rules (from CODING_RULES.md — always apply)

1. Run `npm run build` before marking any task done.
2. All files must be UTF-8 without BOM. Never save as ANSI/Windows-1252.
3. Make minimal changes; do not reformat files unless strictly necessary.
4. Every new feature must be reviewed against the Attention Center rule (see `src/attention/ATTENTION_RULE.md`): if a feature generates a decision, risk, or recommendation for the manager, it must create an item in the Attention Center.
5. Every screen must work on mobile.
6. When adding new fields to saved game state, provide defaults or a migration so existing saves remain compatible.
7. Never use or expose `service_role_key` in the frontend.
8. Never modify or commit `.env` files.

## Architecture

### Single-component state machine

All game state lives in `src/App.jsx` as a single large component. There is no Redux, Zustand, or Context API — state is passed as props. `App.jsx` imports from every engine module and orchestrates all game logic (match simulation, season advancement, transfers, etc.).

### Data loading

At startup, `src/main.jsx` fetches `/data/data.json`. If found and valid, it's passed as `externalData` to `App.jsx`; otherwise the app falls back to built-in data defined in `src/App.jsx` (the `TEAMS` constant and `REAL_SQUADS` object) and `src/data/dataLoader.js`. `dataLoader.js` merges external and built-in data and resolves player photo URLs.

### Engine modules

Each game system lives in its own folder under `src/` with a single `*Engine.js` file containing pure functions:

| Folder | Responsibility |
|---|---|
| `match/` | `matchFlow.js` (formations, lineup building), `liveMatchEngine.js` (live match state), `statisticalEngine.js` (goal/card/injury events) |
| `medical/` | Injury risk, recovery phases, physical load |
| `training/` | Weekly training plans, development modifiers |
| `transfers/` | Offer creation, negotiation, AI transfers, market listings |
| `contracts/` | Renewal offers, counters, salary negotiation |
| `scouting/` | Scout missions, watchlist, signing registration |
| `youth/` | Academy development cycles, annual reports |
| `morale/` | Player and squad morale, locker room summary |
| `legacy/` | Prestige levels, season evaluation, legacy scoring |
| `news/` | News generation per event type (match, transfer, medical, etc.) |
| `attention/` | Attention Center items (actionable items, not just news) |
| `fans/` | Fanbase reactions to results, transfers, youth |
| `conversations/` | Conversation memory with players/staff |
| `clubLife/` | Club life issues and resolutions |
| `coach/` | Coach career, match record, season finalization |
| `legacyDirector/` | Director expectations, selection, event system |
| `scenes/` | Scene/cutscene building from director items |
| `cloud/` | Supabase cloud save service, conflict resolution |
| `state/` | `gameStateSelectors.js` — derived player state (availability, risk, physical status) |

### Navigation

Defined in `src/navigation/navigationConfig.js`. Two levels:
- `PRIMARY_NAV`: 5 bottom-tab items (dashboard, squad, lineup, news, más/more)
- `MORE_SECTIONS`: secondary screens accessible via the "Más" tab (transfers, contracts, medical, training, etc.)

`SECONDARY_SCREEN_IDS` is a Set used throughout App.jsx to determine navigation behaviour.

### Persistence

- **Primary**: `localStorage` — entire game state serialized on every meaningful action.
- **Optional cloud**: Supabase (`@supabase/supabase-js`). Frontend uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Conflict detection compares `updated_at` timestamps before overwriting. Cloud failures never block the game — local save is always the fallback.

### UI patterns

- All styles are inline (`style={{...}}`). No CSS files, no CSS modules, no Tailwind.
- `src/components/SwipeNavigation.jsx` provides swipe gesture navigation (`SwipeTabs`, `useEdgeSwipeBack`).
- Player photos: `/public/players/{player-id}.png`. Team crests: `/public/teams/{team-id}.png`. Missing images show fallback avatars.
- `src/components/ui/Button.jsx` is the only shared primitive component.

### Player data shape

Players are created with the `_p()` helper in `App.jsx`. Key fields:
- `id`, `name`, `pos` (position code e.g. `"DC"`, `"MCD"`), `group` (e.g. `"DEL"`, `"MED"`, `"DEF"`, `"POR"`)
- `overall`, `age`, `nat`, `rarity` (`"BRONZE"/"SILVER"/"GOLD"/"SPECIAL"`)
- `attrs`: `{ritmo, tiro, pase, regate, defensa, fisico, porteria}`
- `fatigue`, `morale`, `injured`, `injuryGames`, `suspended`, `suspGames`, `yellowCards`, `salary` (€K/week)
- `medical` (phase, type, recovery), `moraleEvents`, `medicalHistory` added by engines at runtime

### Deployment

Deployed on Vercel. Any `git push` to `main` triggers an automatic redeploy. `public/data/data.json` can be updated without a code redeploy to refresh player/team data.

## Project Philosophy

Legacy Manager is a football management game where the player remembers people, decisions, and seasons — not isolated statistics. Every feature must serve this goal. The interface represents a club, never an administrative app.

## Current State (v0.96)

- ~80% complete toward v1.0
- Encoding bug: many Spanish strings in source files are corrupted (e.g. `lesiÃ³n` instead of `lesión`). This must be fixed across all engine files before v1.0.
- `App.jsx` is ~7800 lines — all game state and handlers live here. This is the main technical debt. Do not make it larger; extract logic when touching it.
- `TransferState`, `AttentionState`, `TrainingState`, `CompetitionState` in `gameStateSelectors.js` are empty stubs — Single Source of Truth is incomplete.

## Priorities before v1.0

1. Fix encoding (UTF-8) across all source files
2. Fix known desync bugs between modules
3. Balance: goal engine, injuries, fatigue, individual training impact
4. Deepen PARCIAL modules: medical, locker room, board, finances, news
5. Do not add new major features until the above are stable

## Key Rules (repeat for emphasis)

- Never increase App.jsx size without extracting something else first
- Every change must pass `npm run build` with zero errors
- Test on mobile viewport before marking done
- Existing saves must remain compatible after every change
