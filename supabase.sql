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

-- ---- Planos (archivos) ----
-- Bucket privado; cada usuario solo accede a su carpeta (<user_id>/<archivo>).
insert into storage.buckets (id, name, public) values ('planos', 'planos', false) on conflict (id) do nothing;

create policy "planos select" on storage.objects for select using (bucket_id = 'planos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "planos insert" on storage.objects for insert with check (bucket_id = 'planos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "planos update" on storage.objects for update using (bucket_id = 'planos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "planos delete" on storage.objects for delete using (bucket_id = 'planos' and (storage.foldername(name))[1] = auth.uid()::text);
