create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'oficina', 'tecnico', 'solo_lectura');

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  company_name text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create trigger update_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create policy "user_roles_select_own"
on public.user_roles
for select
to authenticated
using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null default 'particular',
  phone text,
  email text,
  address text,
  zone text,
  notes text,
  tags text[] not null default '{}',
  pending_balance numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.clients to authenticated;
grant all on public.clients to service_role;

alter table public.clients enable row level security;

create policy "clients_manage_own"
on public.clients
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create trigger update_clients_updated_at
before update on public.clients
for each row execute function public.update_updated_at_column();

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  address text,
  category text not null,
  name text not null,
  brand text,
  model text,
  serial text,
  location text,
  photo_url text,
  installation_date date,
  warranty_until date,
  status text not null default 'activo',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.assets to authenticated;
grant all on public.assets to service_role;

alter table public.assets enable row level security;

create policy "assets_manage_own"
on public.assets
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create trigger update_assets_updated_at
before update on public.assets
for each row execute function public.update_updated_at_column();

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  client_id uuid references public.clients(id) on delete set null,
  asset_id uuid references public.assets(id) on delete set null,
  type text,
  status text not null default 'nuevo',
  priority text not null default 'media',
  technician text,
  service_id text,
  origin text not null default 'app',
  symptoms text,
  description text,
  diagnosis text,
  solution text,
  notes_internal text,
  notes_client text,
  lessons text,
  quoted_total numeric(12,2) not null default 0,
  final_total numeric(12,2) not null default 0,
  estimated_hours numeric(8,2) not null default 0,
  real_hours numeric(8,2) not null default 0,
  distance_km numeric(8,2) not null default 0,
  urgent boolean not null default false,
  labor numeric(12,2) not null default 0,
  call_out numeric(12,2) not null default 0,
  km_cost numeric(12,2) not null default 0,
  materials_cost numeric(12,2) not null default 0,
  materials_sale numeric(12,2) not null default 0,
  subtotal numeric(12,2) not null default 0,
  vat numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  gross_margin numeric(12,2) not null default 0,
  actual_material_cost numeric(12,2) not null default 0,
  actual_material_notes text,
  scheduled_at timestamptz,
  completed_at timestamptz,
  warranty_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, code)
);

grant select, insert, update, delete on public.jobs to authenticated;
grant all on public.jobs to service_role;

alter table public.jobs enable row level security;

create policy "jobs_manage_own"
on public.jobs
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create trigger update_jobs_updated_at
before update on public.jobs
for each row execute function public.update_updated_at_column();

create table public.job_materials (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  material_id text,
  name text not null,
  qty numeric(10,2) not null default 0,
  unit_cost numeric(12,2) not null default 0,
  sale_price numeric(12,2) not null default 0,
  cost_total numeric(12,2) not null default 0,
  sale_total numeric(12,2) not null default 0,
  kind text not null default 'planned',
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.job_materials to authenticated;
grant all on public.job_materials to service_role;

alter table public.job_materials enable row level security;

create policy "job_materials_manage_own"
on public.job_materials
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  invoice_number text,
  subtotal numeric(12,2) not null default 0,
  vat numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null default 'borrador',
  method text not null default 'otro',
  issued_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.invoices to authenticated;
grant all on public.invoices to service_role;

alter table public.invoices enable row level security;

create policy "invoices_manage_own"
on public.invoices
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create trigger update_invoices_updated_at
before update on public.invoices
for each row execute function public.update_updated_at_column();

create table public.job_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  note text,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.job_events to authenticated;
grant all on public.job_events to service_role;

alter table public.job_events enable row level security;

create policy "job_events_manage_own"
on public.job_events
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create or replace function public.log_job_status_event()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.job_events (owner_id, job_id, event_type, from_status, to_status, note)
    values (new.owner_id, new.id, 'trabajo_creado', null, new.status, 'Creación de trabajo');
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    insert into public.job_events (owner_id, job_id, event_type, from_status, to_status, note)
    values (new.owner_id, new.id, 'estado_actualizado', old.status, new.status, 'Cambio de estado');
  end if;

  return new;
end;
$$;

create trigger jobs_log_status_insert
after insert on public.jobs
for each row execute function public.log_job_status_event();

create trigger jobs_log_status_update
after update of status on public.jobs
for each row execute function public.log_job_status_event();

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  asset_id uuid references public.assets(id) on delete set null,
  bucket text not null default 'astoreka-photos',
  path text not null,
  caption text,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.photos to authenticated;
grant all on public.photos to service_role;

alter table public.photos enable row level security;

create policy "photos_manage_own"
on public.photos
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create table public.knowledge_base (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  category text,
  brand text,
  model text,
  symptom text,
  probable_cause text,
  solution text,
  parts_used text,
  confidence text,
  source_job_id uuid references public.jobs(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.knowledge_base to authenticated;
grant all on public.knowledge_base to service_role;

alter table public.knowledge_base enable row level security;

create policy "knowledge_base_manage_own"
on public.knowledge_base
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create trigger update_knowledge_base_updated_at
before update on public.knowledge_base
for each row execute function public.update_updated_at_column();

create index idx_clients_owner on public.clients(owner_id);
create index idx_assets_owner on public.assets(owner_id);
create index idx_assets_client on public.assets(client_id);
create index idx_jobs_owner on public.jobs(owner_id);
create index idx_jobs_status on public.jobs(status);
create index idx_jobs_client on public.jobs(client_id);
create index idx_invoices_owner_status on public.invoices(owner_id, status);
create index idx_job_events_job on public.job_events(job_id);
create index idx_photos_job on public.photos(job_id);
create index idx_knowledge_owner on public.knowledge_base(owner_id);