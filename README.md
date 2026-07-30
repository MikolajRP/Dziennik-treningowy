# Dziennik Treningowy

Osobisty dziennik treningowy — Next.js (App Router) + Supabase. Przepisany 1:1 z prototypu
React (`DziennikTreningowy.jsx`): ten sam model danych, te same obliczenia (tonaż, plyo,
izometria, minuty funkcjonalne/aerobowe, PR), ten sam przepływ formularza. Zamiast
`window.storage` dane są trwałe w Postgresie (Supabase), a dostęp jest chroniony logowaniem
e-mail / magic link (Supabase Auth).

## Stos

- **Next.js 16** (App Router, TypeScript)
- **Supabase** — Postgres + Auth (magic link) + Row Level Security
- **Tailwind CSS 4** do layoutu, inline style dla tokenów designu (kolory/fonty)
- **Recharts** do wykresów raportów
- **lucide-react** do ikon

## Struktura

```
app/
  page.tsx              # server component: pobiera dane usera i renderuje Journal
  login/page.tsx         # logowanie magic link
  auth/confirm/route.ts   # weryfikacja tokenu z linku e-mail
  auth/actions.ts          # server action wylogowania
components/
  Journal.tsx             # główny komponent kliencki (stan, wiązanie z Supabase)
  LogTab.tsx, ReportsTab.tsx, WorkoutForm.tsx,
  ExerciseEditor.tsx, CircuitEditor.tsx, atoms.tsx
lib/
  types.ts                 # model danych (Workout, ćwiczenia, obwody, cykle)
  calculations.ts           # czyste funkcje obliczeniowe (1:1 z prototypem)
  data.ts                    # zapytania do Supabase (workouts/categories/cycles)
  design.ts                   # tokeny designu: kolory, fonty, domyślne kategorie
  supabase/{client,server,proxy}.ts
proxy.ts                      # Next.js 16 proxy (dawne middleware) — ochrona tras
supabase/migrations/0001_init.sql  # schemat bazy + RLS
```

## Konfiguracja Supabase

1. Utwórz projekt na [supabase.com](https://supabase.com).
2. W **SQL Editor** uruchom zawartość `supabase/migrations/0001_init.sql` — utworzy tabele
   `workouts`, `categories`, `cycles` wraz z Row Level Security (każdy użytkownik widzi tylko
   swoje dane).
3. W **Authentication → Providers** upewnij się, że logowanie e-mail (magic link) jest
   włączone (domyślnie jest).
4. W **Authentication → URL Configuration** dodaj adres aplikacji (np.
   `http://localhost:3000` oraz docelowy adres na Vercel) do *Redirect URLs*, żeby link z
   maila poprawnie wracał na `/auth/confirm`.
5. Skopiuj `Project URL` i `anon public` klucz z **Project Settings → API**.

## Uruchomienie lokalne

```bash
cp .env.example .env.local
# uzupełnij NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_ANON_KEY

npm install
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000) — nieautoryzowany użytkownik trafia na
`/login`, gdzie może wysłać sobie link logowania na e-mail.

## Wdrożenie na Vercel

1. Zaimportuj repozytorium w Vercel.
2. Ustaw zmienne środowiskowe `NEXT_PUBLIC_SUPABASE_URL` i `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (Project Settings → Environment Variables).
3. Po pierwszym deployu dodaj domenę produkcyjną do *Redirect URLs* w Supabase Auth (patrz
   punkt 4 powyżej).

## Model danych

Patrz `lib/types.ts` i `lib/calculations.ts` — pełny opis w opisie zadania (typy ćwiczeń:
strength / plyo / isometric / functional / aerobic, obwody jako kontener, jednostronne serie
L/P, PR jako najwyższy tonaż w kategorii).
