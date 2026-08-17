-- Enriches a Strava-synced activity with Garmin-only metrics Strava's API
-- doesn't expose to this app (training effect, training load, VO2max,
-- respiration, stress) — matched to the corresponding Garmin activity by
-- start time (see enrichStravaActivitiesWithGarmin in lib/garmin.ts), since
-- Strava and Garmin activity IDs share no common identifier.

alter table public.strava_activities
  add column if not exists garmin_activity_id bigint,
  add column if not exists garmin_vo2max numeric,
  add column if not exists garmin_training_effect_aerobic numeric,
  add column if not exists garmin_training_effect_anaerobic numeric,
  add column if not exists garmin_training_effect_label text,
  add column if not exists garmin_training_load numeric,
  add column if not exists garmin_avg_respiration_rate numeric,
  add column if not exists garmin_avg_stress numeric;

-- Guards against matching the same Garmin activity to two different Strava
-- rows (the app's own matching loop already avoids this within one sync
-- pass, but not across separate pending backfills).
create unique index if not exists strava_activities_garmin_activity_id_idx
  on public.strava_activities (garmin_activity_id)
  where garmin_activity_id is not null;
