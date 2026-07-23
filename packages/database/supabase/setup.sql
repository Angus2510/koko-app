-- ─────────────────────────────────────────────────────────────────────────────
-- Run this SQL in your Supabase project → SQL Editor
--
-- This trigger automatically creates a row in public.profiles whenever a new
-- user is created in auth.users (via Supabase Auth sign-up or invite).
--
-- Without this, the dashboard layout would redirect users to /login even
-- after successful authentication.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create the trigger function
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'PRODUCTION_WORKER'
  );
  return new;
end;
$$;

-- 2. Attach trigger to auth.users
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security (RLS)
-- Enable RLS on all tables and add baseline policies.
-- ─────────────────────────────────────────────────────────────────────────────

-- profiles: users can read all profiles, only update their own
alter table public.profiles enable row level security;

create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- All other tables: authenticated users can read/write (role-based auth is
-- enforced at the application layer in Server Actions).
-- Tighten these policies per-table as your security requirements grow.

alter table public.production_stages    enable row level security;
alter table public.product_categories   enable row level security;
alter table public.products             enable row level security;
alter table public.recipe_items         enable row level security;
alter table public.suppliers            enable row level security;
alter table public.inventory_items      enable row level security;
alter table public.purchases            enable row level security;
alter table public.purchase_items       enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.production_jobs      enable row level security;
alter table public.production_job_stage_logs enable row level security;
alter table public.finished_stock       enable row level security;

-- Blanket authenticated-user access (tighten per-table as needed)
do $$
declare
  t text;
  tables text[] := array[
    'production_stages', 'product_categories', 'products', 'recipe_items',
    'suppliers', 'inventory_items', 'purchases',
    'purchase_items', 'inventory_transactions', 'production_jobs',
    'production_job_stage_logs', 'finished_stock'
  ];
begin
  foreach t in array tables loop
    execute format(
      'create policy "%s_authenticated" on public.%s for all to authenticated using (true) with check (true)',
      t, t
    );
  end loop;
end;
$$;
