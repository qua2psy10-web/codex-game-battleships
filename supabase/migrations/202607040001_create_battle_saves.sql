create table if not exists public.battle_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  save_data jsonb not null,
  client_updated_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.battle_saves enable row level security;

create policy "users can read their own battle save"
on public.battle_saves
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users can insert their own battle save"
on public.battle_saves
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users can update their own battle save"
on public.battle_saves
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.set_battle_save_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_battle_save_updated_at on public.battle_saves;
create trigger set_battle_save_updated_at
before update on public.battle_saves
for each row execute function public.set_battle_save_updated_at();
