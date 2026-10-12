-- Ejecutar una sola vez en Supabase > SQL Editor.
-- Cada usuario solo puede ver y modificar sus propios proyectos (Row Level Security).
create table if not exists public.projects (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "own select" on public.projects for select using (auth.uid() = user_id);
create policy "own insert" on public.projects for insert with check (auth.uid() = user_id);
create policy "own update" on public.projects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own delete" on public.projects for delete using (auth.uid() = user_id);
