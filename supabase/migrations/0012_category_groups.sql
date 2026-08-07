-- Groups workout categories by kind of activity (Bieganie / Inne aktywności
-- / Siłownia) instead of one flat, ever-growing list.

alter table public.categories
  add column if not exists group_name text not null default 'silownia'
  check (group_name in ('bieganie', 'inne', 'silownia'));

-- Best-effort reclassification of existing category names that clearly
-- belong under "Inne aktywności" rather than the strength-default bucket.
update public.categories
set group_name = 'inne'
where lower(name) in ('cardio', 'kolarstwo', 'rower', 'orbitrek', 'pływanie', 'plywanie', 'basen', 'trekking');

-- New running sub-types are brand-new category values, not a reclassification
-- of existing ones — insert them for every user who already has at least one
-- category (i.e. has actually used the journal), skipping anyone who already
-- has a same-named category.
insert into public.categories (user_id, name, group_name)
select distinct c.user_id, v.name, 'bieganie'
from public.categories c
cross join (values
  ('Wybieganie'),
  ('Wybieganie + rytmy'),
  ('2 zakres'),
  ('BNP'),
  ('Próg'),
  ('Tempo')
) as v(name)
on conflict (user_id, name) do nothing;
