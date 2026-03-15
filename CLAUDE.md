# Państwa Miasta — Development Guide

## Project Overview

Państwa Miasta is a real-time multiplayer word game (Polish "Stadt, Land, Fluss") for iOS, Android, and Web. Players fill in words starting with a randomly chosen letter across categories like Country, City, River, Plant, Animal, Name.

**Repository structure:**
```
app/              — Expo Router routes (file-based navigation)
src/              — Feature modules, components, services, stores, utilities
  components/     — Shared UI (ui/, game/, layout/, ads/)
  features/       — Feature modules (auth, room, round, voting, scoring, ads, iap)
  services/       — Firebase config and helpers
  stores/         — Global Zustand stores
  types/          — TypeScript interfaces
  constants/      — Game constants, alphabets, categories
  locales/        — i18n translation files (pl/, en/)
  utils/          — Pure utility functions
functions/        — Firebase Cloud Functions (Node.js 20, TypeScript)
assets/           — Static assets (fonts, images)
```

---

## Tech Stack

| Concern | Library |
|---------|---------|
| Framework | Expo SDK 52 (bare workflow) + Expo Router v4 |
| Language | TypeScript strict (no `any`) |
| UI | NativeWind v4 (Tailwind CSS) |
| State | Zustand + immer |
| Firebase SDK | v10 modular (`firebase/firestore`, `firebase/auth`, `firebase/functions`) |
| Real-time | Firestore onSnapshot (max 2 listeners active at a time) |
| Presence | Firebase Realtime Database `.onDisconnect()` |
| Lists | @shopify/flash-list |
| Animations | React Native Reanimated 3 + Gesture Handler |
| Forms | React Hook Form v7 (uncontrolled inputs) |
| i18n | react-i18next + expo-localization |
| Ads | react-native-google-mobile-ads |
| IAP | react-native-purchases (RevenueCat) |
| Testing | Jest + React Native Testing Library + MSW |

---

## Firebase Setup

### 1. Create a Firebase Project
Go to [console.firebase.google.com](https://console.firebase.google.com) and create a new project.

Enable these services:
- **Authentication** — Anonymous, Google, Apple Sign-In
- **Firestore Database** — Production mode (apply security rules from `firestore.rules`)
- **Cloud Functions** — Node.js 20 runtime
- **Realtime Database** — For player presence only

### 2. Environment Variables
Copy Firebase config to `.env.local` (never commit this file):

```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_FIREBASE_DATABASE_URL=
EXPO_PUBLIC_ADMOB_BANNER_ID=ca-app-pub-3940256099942544/6300978111       # test ID
EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID=ca-app-pub-3940256099942544/1033173712  # test ID
EXPO_PUBLIC_REVENUECAT_API_KEY=
```

### 3. Deploy Rules and Functions
```bash
firebase deploy --only firestore:rules
firebase deploy --only functions
```

---

## Dev Commands

```bash
# App
npm run start          # Expo dev server (scan QR with Expo Go or dev client)
npm run ios            # Run on iOS simulator (requires Xcode)
npm run android        # Run on Android emulator (requires Android Studio)
npm run web            # Run in browser (Metro bundler)
npm run typecheck      # TypeScript check without emitting
npm run test           # Jest (watch mode)
npm run test:ci        # Jest (single run, with coverage)

# Firebase Local Emulator (recommended for development)
firebase emulators:start --only auth,firestore,functions,database

# Firebase Cloud Functions
cd functions
npm run build          # Compile TypeScript → lib/
npm run serve          # Build + start function emulator
npm run deploy         # Deploy to Firebase
npm run logs           # Stream live function logs
```

---

## Architecture Decisions

### Why Expo Bare Workflow
`react-native-google-mobile-ads` requires native module linking not available in Expo Go.
Bare workflow gives us native build control while keeping Expo toolchain (EAS Build, OTA updates).
All native module plugins are configured via `app.json` plugins array — never touch native files directly.

### Why Cloud Functions for State Transitions
Room `status` changes MUST happen server-side. Client-side transitions would allow cheating
(e.g., skipping the voting phase). Cloud Functions use the Admin SDK which bypasses Firestore
security rules. Status is write-blocked for clients in `firestore.rules`.

### Why Max 2 Firestore Listeners
Each Firestore `onSnapshot` costs a read on every document update. We keep at most:
- 1 listener on `/rooms/{roomCode}` (always active during a game)
- 1 listener on `/rooms/{roomCode}/rounds/{n}` (only during `round_active`)

Never subscribe to entire subcollections or collection groups from the client.

### Why Firebase Realtime Database for Presence
Firestore has no native `.onDisconnect()` hooks. RTDB fires reliably on connection drop.
We use RTDB only for presence (`/presence/{uid}/connected`). All game state is in Firestore.

### Why Server-Side Letter Generation
The random letter for each round is picked in `startRound` Cloud Function, not on the client.
This prevents the host from seeing or manipulating the letter before other players.

### Why app/(game)/_layout.tsx is the Orchestrator
A single Firestore listener lives here. It watches `room.status` and calls `router.replace()`
to move all players to the correct screen atomically. Every game screen is just a view —
no screen decides when to navigate away.

---

## Coding Conventions

### TypeScript
- Strict mode. No `any`. Use `unknown` when type is truly unknown.
- All Firestore document shapes defined in `src/types/firebase.ts` with type-safe converters.
- Runtime validation of Cloud Function inputs via Zod.

### Exports
- **Named exports everywhere** — except for `app/` route files (Expo Router requires default exports).
- Avoids auto-import ambiguity and makes tree-shaking more predictable.

### Components
```tsx
// Component file structure:
// 1. External imports
// 2. Internal imports (absolute, then relative)
// 3. Types/interfaces
// 4. Component (named export)
// 5. Styles (NativeWind classes inline or StyleSheet at bottom)
```

### Naming
- Components: `PascalCase.tsx`
- Hooks: `useFeatureName.ts`
- Services: `featureService.ts` (stateless functions, no classes)
- Stores: `featureStore.ts`
- Constants: `UPPER_SNAKE_CASE` for primitives, `camelCase` for objects

### Internationalization
Never use hardcoded user-visible strings. Always:
```tsx
const { t } = useTranslation('game');
return <Text>{t('round.fill_in_words')}</Text>;
```
All translation keys live in `src/locales/{lang}/{namespace}.json`.

### Answer Normalization
When comparing answers for scoring: lowercase + trim + collapse whitespace.
Do NOT strip Polish diacritics — "Kraków" ≠ "Krakow" is intentional and correct.
Use `src/utils/normalizeAnswer.ts`.

---

## Testing Approach

### Unit Tests (Jest)
- Pure functions: `calculateScores`, `normalizeAnswer`, `generateRoomCode`
- Zustand stores: test via actions, verify state changes
- Location: `__tests__/` folder co-located with the tested file

### Component Tests (RNTL)
- Test user interactions, not implementation details
- Mock Firebase with MSW (Mock Service Worker)
- Key tests: voting interactions, form submit, answer validation edge cases

### Integration Tests
- Full game flow against Firebase emulator (NOT mocked)
- Located in `__tests__/integration/`
- Run in CI only: `npm run test:ci`

### Do NOT Test
- Visual styling
- Expo Router navigation itself
- Firebase SDK internals

---

## Firestore Security Rules Principles
- `status` field: blocked from client writes (Admin SDK only changes it)
- Players may only write `playerAnswers[theirOwnUid]` in round documents
- All reads require authentication
- Room writes require the writer to be a player in the room

---

## Important Gotchas

### AdMob Test IDs
Always use test ad unit IDs in development (see `.env.local` template above).
Using real ad IDs in dev risks AdMob account suspension.

### Apple Sign-In Requirement
Apple requires any iOS app offering Google Sign-In to also offer Apple Sign-In.
Both must ship together — do not release one without the other.

### Web IAP
RevenueCat/StoreKit does not work on web. Gate purchase button:
```tsx
if (Platform.OS !== 'web') { /* show IAP button */ }
```
On web, the "remove ads" entitlement defaults to `true` — web plays ad-free.

### Firestore Offline Persistence
Enabled by default on native, disabled on web. On reconnect, always re-read
`room.status` before assuming current state — cached state may be stale.

### Player Count Validation
Validate 2–8 players in `startRound` Cloud Function, not just client-side.
Client validation is UX feedback only.

### Cloud Tasks for Countdown
The `playerFinished` function should enqueue a Cloud Task to call `endRound`
at `countdownEndsAt` time. This is more reliable than polling or scheduled functions.
(Cloud Tasks setup requires GCP Console configuration — see `/docs/cloud-tasks-setup.md`.)

### npm Cache Permissions
On this machine, npm cache may have files owned by root. Use:
```bash
npm install --cache /tmp/npm-cache-pm
```
if you hit EACCES errors during install.
