create extension if not exists "pgcrypto";

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('authenticated')),
  title text not null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant')),
  content text not null,
  attachment_ids text[] not null default '{}',
  recall jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  chat_id uuid references public.chats(id) on delete set null,
  name text not null,
  mime_type text not null,
  kind text not null check (kind in ('document', 'image', 'audio')),
  storage_path text not null,
  preview_url text,
  extracted_text text,
  insight jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chats_user_id_last_message_idx on public.chats (user_id, last_message_at desc);
create index if not exists messages_chat_id_created_at_idx on public.messages (chat_id, created_at asc);
create index if not exists attachments_chat_id_created_at_idx on public.attachments (chat_id, created_at asc);

alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.attachments enable row level security;

create policy "users can read own chats"
on public.chats for select
to authenticated
using (auth.uid() = user_id);

create policy "users can create own chats"
on public.chats for insert
to authenticated
with check (auth.uid() = user_id);

create policy "users can read own messages"
on public.messages for select
to authenticated
using (
  exists (
    select 1 from public.chats
    where public.chats.id = public.messages.chat_id
      and public.chats.user_id = auth.uid()
  )
);

create policy "users can read own attachments"
on public.attachments for select
to authenticated
using (user_id = auth.uid());
