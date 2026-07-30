create table if not exists public.app_snapshots (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  sequence integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.app_snapshots to authenticated;
grant all on public.app_snapshots to service_role;

alter table public.app_snapshots enable row level security;

create policy "app_snapshots_manage_own"
on public.app_snapshots
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create trigger update_app_snapshots_updated_at
before update on public.app_snapshots
for each row execute function public.update_updated_at_column();
