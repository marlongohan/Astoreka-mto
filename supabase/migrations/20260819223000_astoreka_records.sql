create table if not exists public.astoreka_records (
  owner_id uuid not null references auth.users(id) on delete cascade,
  entity text not null,
  record_id text not null,
  record_key text generated always as (entity || ':' || record_id) stored,
  data jsonb not null,
  sync_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, entity, record_id),
  unique (owner_id, record_key)
);

grant select, insert, update, delete on public.astoreka_records to authenticated;
grant all on public.astoreka_records to service_role;

alter table public.astoreka_records enable row level security;

create policy "astoreka_records_manage_own"
on public.astoreka_records
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create trigger update_astoreka_records_updated_at
before update on public.astoreka_records
for each row execute function public.update_updated_at_column();

create index if not exists idx_astoreka_records_owner_entity
on public.astoreka_records(owner_id, entity);

