# Supabase friends multiplayer and 360° preview

This implementation uses the existing JavaScript ES modules, Three.js renderer, animation/combat code and Rapier world. No framework migration or separate game-server service is required for this friends/testing version. It is not a dedicated-server competitive multiplayer implementation.

## 1. Choose JavaScript

In the Supabase Connect dialog choose Framework → JavaScript / Vanilla JavaScript if offered. If that option is absent, close the framework wizard: do not choose React just to connect this game. Copy your project's URL and publishable API key from Project Settings / API Keys. You do not need Direct, ORM, MCP, a database connection string, a database password or a secret key.

## 2. Enable guest accounts

In Supabase Authentication settings enable Anonymous Sign-ins. Each browser creates a real authenticated guest user. Guest users use the authenticated database role; the public API key alone does not identify a player. For public availability configure the available Auth rate limits/CAPTCHA appropriately; a CAPTCHA-enabled project will require adding its token flow before anonymous sign-in works here.

Guest identity persists in that browser's local storage. Clearing browser data loses access to that identity. Permanent email/OAuth accounts and cloud campaign progression are future work; existing campaign saves stay local.

## 3. Create the room schema and access policies

Open the SQL Editor in your Supabase project. Paste the complete contents of `supabase/migrations/001_multiplayer.sql` and run it once. The transaction creates:

- `sc_rooms` and `sc_members`, readable only to room members.
- Controlled RPC functions for create/join/ready/start/finish/leave/heartbeat.
- An atomic four-player capacity limit and all-ready requirement.
- Private Realtime Broadcast policies for `sc:<room UUID>:<sender UUID>`.

There is no direct client write access to room tables. Each authenticated player can broadcast only to their own sender topic; guests subscribe to the host's topic for authoritative snapshots. Do not add permissive public table or Realtime policies that bypass these restrictions. PostgreSQL combines permissive policies using OR.

This is a one-time migration, not a script to rerun on every launch. An "already exists" error after applying it means you should inspect the existing schema rather than create duplicate policies.

## 4. Enable private Realtime access

In Realtime Settings, disable **Allow public access** to enforce private channels. The game uses private Broadcast channels with JWT authentication. You do not need to enable Postgres Changes replication on these tables; the lobby polls rows every three seconds and sends a membership heartbeat every ten seconds.

## 5. Add browser configuration

Edit `src/online/config.js`:

```js
export const SUPABASE_CONFIG = {
  url: 'https://YOUR-PROJECT.supabase.co',
  publishableKey: 'sb_publishable_YOUR_KEY',
};
```

These values are intentionally browser-visible. Never place `sb_secret_...`, `service_role`, a database password or an access token in this file. The client accepts the standard Supabase project URL and modern publishable key. React/Vite environment-variable instructions do not apply to this no-bundler project.

The official `@supabase/supabase-js` dependency is installed and its local, self-contained UMD bundle loads only when a player connects. Run `npm install` on a fresh clone, then `npm start`. No CDN runtime dependency is needed. The existing build script also copies this bundle into the static deployment and adjusts its path; no build artifacts were produced for this change.

## 6. Play with friends

1. Open the game and choose a fighter. Drag the hero preview all the way around; scroll/pinch to zoom. Arrow keys rotate when the preview is focused; plus/minus zoom. Reset view restores the front.
2. Open **Play with friends / Online**, enter a display name and choose **Create**.
3. Share the ten-character room code. Friends open the same deployed game, choose a fighter and enter the code under **Join**.
4. Everyone selects **Ready**, including the host. Changing a character or name clears ready. The host can start with two to four players.
5. The game waits for clients to acknowledge loading, then counts down three seconds. Free-for-all uses a two-minute elimination round. Last fighter standing wins; at timeout, highest remaining health percentage wins, with equal values drawing.
6. After the round, the host chooses **Return everyone to room**. Players ready again for a rematch, or leave. Returning to offline play restores original actor teams/models and the existing bot/campaign workflow.

For testing on one computer, use a normal browser window plus an incognito window or separate browser profiles. Two tabs sharing the same guest session represent the same user, not two separate players. A guest can belong to only one room at a time. If a tab reloads mid-round, rejoin after the host returns to the room; mid-round joining/reconnection is intentionally not supported.

`localhost` only works on your computer. Friends elsewhere need the same deployed HTTPS game URL, such as your existing Vercel deployment. Supabase hosts the backend, not the large fighter assets. For LAN testing your local server must be reachable from the other device; use the serving computer's LAN address, not localhost on the friend's device.

## Architecture and limits

| Component | Responsibility |
| --- | --- |
| Supabase Auth | Persistent browser guest identity and JWT |
| PostgreSQL + RPC/RLS | Private room code, membership, fighter choice, ready state, host lifecycle |
| Private Realtime Broadcast | Player input intents and host snapshots/events |
| Host browser | Existing fixed 60 Hz Combatant, animation-driven sweeps, projectiles, powers, statuses, environment damage and Rapier simulation |
| Guest browsers | Use room-size rates (2 players: 15 Hz; 3: 10 Hz; 4: 6 Hz for inputs and snapshots) with an adaptive presentation buffer (at least 100 ms); animate/render authoritative state |

Clients send movement direction, aim point, guard and attack button intents. They do not submit health, world positions, damage or hit results. The host rejects non-finite/out-of-range inputs, duplicate sequence numbers, excessive packet rates and attempts to invoke internal ultimate stages. Inputs expire after 500 ms so disconnected players do not keep moving or firing. A disconnected guest is eliminated after 12 seconds without input. Missing host snapshots end the guest's round after 12 seconds. Host departure closes the room; there is no host migration. A visible Leave button is available during matches. Online rounds cannot pause; releasing the mouse or switching tabs does not intentionally pause everyone's simulation. Browser background throttling can still interrupt a host, so keep its tab active.

Snapshots include actor positions/health/cooldowns/statuses, actual current animation stage and normalized time, projectiles, summoned-power positions, prop health/placement and recent environmental/combat events. Guests render damage popups, flashes, sound, craters, surface marks and power visuals, without calling the combat damage path. Cosmetic debris may scatter differently on each browser; the host's damage and environmental state remain authoritative. A short event history tolerates occasional dropped snapshots. This does not provide reliable recovery from long transport interruptions.

The host is trusted and can cheat. This mode does not award cloud rankings, verified leaderboard records or online campaign progress. There is no client prediction/reconciliation yet: guest movement and attacks include network/interpolation delay, especially across distant regions. A dedicated authoritative game server with prediction is the next architecture for public competitive play. Choose a nearby Supabase region for friends testing. The adapter isolates online simulation from the existing offline match/circuit state machines, preserving dedicated fall/death animations and offline progression.

Supabase free service has quotas; it is not unlimited. Its current project-wide Realtime limit is 100 messages per second, counting sent and delivered messages. Guests subscribe only to their own sender topic and the host topic, and broadcasts do not request per-packet acknowledgements. The default adaptive rates target one active friends room: approximately 60 gameplay messages/second for two or four players, and 70 for three, before control/heartbeat traffic. Multiple simultaneous rooms share the project allowance and are not automatically globally rate-coordinated. Four-player input is deliberately slower (6 Hz) to fit that free budget; this is a testing tradeoff, not the final responsiveness target for a fast brawler. A direct WebRTC transport with Supabase signaling, or a dedicated game server, is the future way to avoid pushing every combat snapshot through the Realtime quota. Check the current billing dashboard for Realtime messages, connections and egress. Broadcast fan-out counts toward usage, so high-frequency snapshots can consume the free allowance during extended play. Positions are never written to PostgreSQL every frame. No optional paid services are enabled by this code.

## Files to edit

- `src/online/config.js`: project connection values.
- `src/online/Protocol.js`: player cap, rates, buffer, timeout and round duration (SQL capacity must also be changed if increasing the cap).
- `src/online/SupabaseRooms.js`: Auth, private channels and database room workflow.
- `src/online/OnlineMatch.js`: authoritative-host bridge and guest presentation.
- `src/online/Multiplayer.js`: online menu, ready/room flow, round overlay.
- `src/ui/HeroPreview.js`: 360° inspection controls; reuses the loaded fighter, weapons and renderer.
- `src/ui/online.css`: preview and multiplayer presentation, including narrow-screen layout.

## Troubleshooting

- **Online setup message**: complete config and SQL first. Offline play remains available.
- **Anonymous sign-ins disabled**: enable the Auth provider; inspect your Auth logs for rate-limit or CAPTCHA requirements.
- **Private channel timed out / connection interrupted**: verify migration policies, project URL/key, authenticated guest identity and Realtime private-access settings. Leave and join again.
- **Room is full / already playing**: only four members, and new players join between rounds.
- **Host disconnects**: round ends; create another room. This version does not elect a replacement host.
- **Game modified while hosting**: live reload restarts the tab and interrupts the match; finish or leave the room before editing code.

## Validation boundary

The SQL was exercised in an isolated PostgreSQL-compatible engine with authenticated/anonymous roles and Auth/Realtime schema stubs. Host and guest rendering/combat were exercised in separate browser pages over a local test relay. These tests do not establish that your live Supabase project is connected: no project credentials were provided and the migration has not been applied to your account. Perform the two-browser test above after configuration before inviting friends.

Official references: [JavaScript SDK](https://supabase.com/docs/reference/javascript/installing), [API keys](https://supabase.com/docs/guides/getting-started/api-keys), [anonymous sign-in](https://supabase.com/docs/guides/auth/auth-anonymous), [Realtime authorization](https://supabase.com/docs/guides/realtime/authorization), [Broadcast](https://supabase.com/docs/guides/realtime/broadcast), [Realtime throughput limits](https://supabase.com/docs/guides/realtime/limits), [billing and free allowances](https://supabase.com/docs/guides/platform/billing-on-supabase).
