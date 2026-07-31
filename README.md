# Dziennik Treningowy

Osobisty dziennik treningowy — Next.js (App Router) + Supabase. Przepisany 1:1 z prototypu
React (`DziennikTreningowy.jsx`): ten sam model danych, te same obliczenia (tonaż, plyo,
izometria, minuty funkcjonalne/aerobowe, PR), ten sam przepływ formularza. Zamiast
`window.storage` dane są trwałe w Postgresie (Supabase), a dostęp jest chroniony logowaniem
e-mail / magic link (Supabase Auth). Biegi ze Stravy (np. z zegarka Garmin zsynchronizowanego
do Stravy) importują się automatycznie przez webhook.

## Stos

- **Next.js 16** (App Router, TypeScript)
- **Supabase** — Postgres + Auth (magic link) + Row Level Security
- **Strava API** — automatyczny import biegów (OAuth + webhook)
- **Tailwind CSS 4** do layoutu, inline style dla tokenów designu (kolory/fonty)
- **Recharts** do wykresów raportów
- **lucide-react** do ikon

## Struktura

```
app/
  page.tsx              # server component: pobiera dane usera i renderuje Journal
  login/page.tsx         # logowanie magic link
  auth/confirm/page.tsx    # obsługa linku logowania (client-side, patrz niżej)
  auth/actions.ts          # server action wylogowania
  api/strava/
    authorize/route.ts      # przekierowanie do ekranu zgody Stravy
    callback/route.ts        # wymiana kodu OAuth na tokeny, zapis połączenia
    webhook/route.ts          # odbiór nowych aktywności ze Stravy (auto-import)
    setup-webhook/route.ts     # jednorazowa rejestracja subskrypcji webhooka
    activities/[id]/streams/route.ts  # dane do wykresów tempo/tętno/wysokość na żądanie
components/
  Journal.tsx             # główny komponent kliencki (stan, wiązanie z Supabase)
  LogTab.tsx, ReportsTab.tsx, WorkoutForm.tsx,
  ExerciseEditor.tsx, CircuitEditor.tsx, atoms.tsx
  StravaConnect.tsx, StravaActivityCard.tsx, StravaRouteShape.tsx,
  WorkoutExerciseSummary.tsx, MergeWorkoutPicker.tsx
lib/
  types.ts                 # model danych (Workout, ćwiczenia, obwody, cykle, StravaActivity)
  calculations.ts           # czyste funkcje obliczeniowe (1:1 z prototypem) + formatery
  stravaCalculations.ts      # agregacje po stronie Stravy (km/czas/strefy tętna wg aktywności)
  strava.ts                   # wywołania API Stravy + import aktywności (server-only)
  data.ts                      # zapytania do Supabase (workouts/categories/cycles/strava)
  design.ts                     # tokeny designu: kolory, fonty, domyślne kategorie
  supabase/{client,server,proxy,admin}.ts
proxy.ts                      # Next.js 16 proxy (dawne middleware) — ochrona tras
supabase/migrations/
  0001_init.sql               # schemat bazy (workouts/categories/cycles) + RLS
  0002_strava.sql              # połączenia Strava, zaimportowane aktywności, czas trwania
```

## Konfiguracja Supabase

1. Utwórz projekt na [supabase.com](https://supabase.com).
2. W **SQL Editor** uruchom po kolei `supabase/migrations/0001_init.sql`, a potem
   `supabase/migrations/0002_strava.sql`.
3. W **Authentication → Providers** upewnij się, że logowanie e-mail (magic link) jest
   włączone (domyślnie jest).
4. W **Authentication → URL Configuration**:
   - **Site URL**: docelowy adres na Vercel (nie `localhost`).
   - **Redirect URLs**: dodaj `http://localhost:3000/auth/confirm` (lokalnie) i
     `https://<twoja-domena>/auth/confirm` (produkcyjnie).
5. Skopiuj z **Project Settings → API**: `Project URL`, `anon public` klucz oraz
   `service_role` klucz (ten ostatni tylko do zmiennej `SUPABASE_SERVICE_ROLE_KEY`,
   nigdy do kodu ani do przeglądarki).

## Konfiguracja Stravy (automatyczny import biegów)

1. Wejdź zalogowany na [strava.com/settings/api](https://www.strava.com/settings/api) i
   utwórz aplikację (Authorization Callback Domain = Twoja domena, bez `https://`).
2. Skopiuj `Client ID` i `Client Secret` do zmiennych `STRAVA_CLIENT_ID` /
   `STRAVA_CLIENT_SECRET`.
3. Wymyśl dowolny losowy ciąg znaków i ustaw go jako `STRAVA_WEBHOOK_VERIFY_TOKEN`.
4. Po wdrożeniu (patrz niżej) wejdź **zalogowany do aplikacji** pod adres
   `/api/strava/setup-webhook` — to jednorazowo zarejestruje webhook Stravy. Jeśli odpowiedź
   mówi, że subskrypcja już istnieje, wszystko jest już skonfigurowane.
5. W samej aplikacji kliknij „Połącz ze Stravą" (przycisk w nagłówku) — to podłącza Twoje
   własne konto. Każda nowa aktywność zarejestrowana na Stravie od tego momentu pojawi się w
   dzienniku automatycznie.

Jeśli Garmin ma być źródłem: połącz Garmin Connect ze Stravą (Strava → Ustawienia →
Aplikacje partnerskie → Garmin) — biegi z zegarka trafią do Stravy, a stamtąd automatycznie
do dziennika.

## Uruchomienie lokalne

```bash
cp .env.example .env.local
# uzupełnij wszystkie zmienne z .env.example

npm install
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000) — nieautoryzowany użytkownik trafia na
`/login`, gdzie może wysłać sobie link logowania na e-mail.

## Wdrożenie na Vercel

1. Zaimportuj repozytorium w Vercel.
2. Ustaw wszystkie zmienne środowiskowe z `.env.example` (Project Settings → Environment
   Variables) — łącznie z `SUPABASE_SERVICE_ROLE_KEY` i zmiennymi `STRAVA_*`.
3. Po pierwszym deployu:
   - dodaj domenę produkcyjną do *Redirect URLs* w Supabase Auth (patrz sekcja Supabase
     powyżej),
   - odwiedź `/api/strava/setup-webhook` zalogowany, żeby zarejestrować webhook (patrz
     sekcja Strava powyżej).

## Model danych

Patrz `lib/types.ts` i `lib/calculations.ts` — pełny opis w opisie zadania (typy ćwiczeń:
strength / plyo / isometric / functional / aerobic, obwody jako kontener, jednostronne serie
L/P, PR jako najwyższy tonaż w kategorii). Zaimportowane aktywności ze Stravy
(`StravaActivity` w `lib/types.ts`) są osobnym elementem dołączonym do treningu
(`Workout.stravaActivities`) — niezależnym od ręcznie wpisywanych ćwiczeń, ale można je ręcznie
połączyć z dowolnym treningiem (patrz `MergeWorkoutPicker`, `lib/data.ts`:
`attachStravaActivities` / `detachStravaActivity`).
