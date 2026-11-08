-- Apply after schema.sql. Owner-only publishing, drafts and private social features.
create or replace function private.can_edit_world(w uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.couple_worlds where id=w and owner_id=auth.uid());
$$;
update public.couple_worlds set partner_can_edit=false where partner_can_edit;
create or replace function private.set_partner_permission(world_id uuid,allow_edit boolean) returns void language plpgsql security definer set search_path='' as $$
begin raise exception 'Only the owner can edit. Partner editing is disabled.'; end $$;
create or replace function private.update_my_avatar(world_id uuid,avatar jsonb) returns public.couple_worlds language plpgsql security definer set search_path='' as $$
declare r public.couple_worlds;
begin
 if not private.can_edit_world(world_id) then raise exception 'Only the owner can edit characters'; end if;
 if jsonb_typeof(avatar)<>'object' or coalesce(length(avatar->>'name'),0) not between 1 and 40 or pg_column_size(avatar)>15000 then raise exception 'Invalid avatar'; end if;
 update public.couple_worlds set state=jsonb_set(state,'{couple,0}',avatar),revision=revision+1,updated_at=now() where id=world_id returning * into r; return r;
end $$;
alter policy couple_media_insert on storage.objects with check(bucket_id='couple-media' and (storage.foldername(name))[2]=auth.uid()::text and private.is_couple_member(((storage.foldername(name))[1])::uuid) and ((storage.foldername(name))[3]='chat' or private.can_edit_world(((storage.foldername(name))[1])::uuid)));
alter policy couple_media_delete on storage.objects using(bucket_id='couple-media' and owner_id=auth.uid()::text and private.is_couple_member(((storage.foldername(name))[1])::uuid) and ((storage.foldername(name))[3]='chat' or private.can_edit_world(((storage.foldername(name))[1])::uuid)));
create table public.couple_drafts(world_id uuid primary key references public.couple_worlds(id) on delete cascade,state jsonb not null check(pg_column_size(state)<400000),updated_at timestamptz not null default now());
alter table public.couple_drafts enable row level security;
create policy owner_drafts on public.couple_drafts for all to authenticated using(private.can_edit_world(world_id)) with check(private.can_edit_world(world_id));
grant select,insert,update,delete on public.couple_drafts to authenticated;
create table public.couple_versions(id uuid primary key default gen_random_uuid(),world_id uuid not null references public.couple_worlds(id) on delete cascade,state jsonb not null,revision integer not null,created_at timestamptz not null default now());
alter table public.couple_versions enable row level security;
create policy owner_versions on public.couple_versions for select to authenticated using(private.can_edit_world(world_id));
grant select on public.couple_versions to authenticated;
create index couple_version_world on public.couple_versions(world_id,created_at desc);
create or replace function private.publish_couple_world(world_id uuid,expected_revision integer,next_state jsonb) returns public.couple_worlds language plpgsql security definer set search_path='' as $$
declare r public.couple_worlds;
begin
 if not private.can_edit_world(world_id) then raise exception 'Only the owner can publish changes'; end if;
 if not public.valid_couple_state(next_state) then raise exception 'Invalid world'; end if;
 select * into r from public.couple_worlds where id=world_id for update;
 if r.revision<>expected_revision then raise exception 'This world changed on another device. Reload before publishing.'; end if;
 insert into public.couple_versions(world_id,state,revision) values(r.id,r.state,r.revision);
 delete from public.couple_versions where id in(select id from public.couple_versions v where v.world_id=r.id order by created_at desc offset 10);
 update public.couple_worlds set state=next_state,revision=revision+1,updated_at=now() where id=world_id returning * into r;
 delete from public.couple_drafts d where d.world_id=r.id;return r;
end $$;
create function private.manage_partner(world_id uuid,remove_partner boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.can_edit_world(world_id) then raise exception 'Only the owner manages access'; end if;
 update public.couple_worlds set invite_hash=null,invite_expires=null,partner_id=case when remove_partner then null else partner_id end where id=world_id;
 if remove_partner then delete from public.couple_presence where couple_presence.world_id=manage_partner.world_id and user_id<>auth.uid(); end if;
end $$;
create function public.manage_partner(world_id uuid,remove_partner boolean) returns void language sql security invoker set search_path='' as $$select private.manage_partner(world_id,remove_partner);$$;
revoke all on function private.manage_partner(uuid,boolean),public.manage_partner(uuid,boolean) from public,anon;
grant execute on function private.manage_partner(uuid,boolean),public.manage_partner(uuid,boolean) to authenticated;
alter table public.couple_messages add column attachment text, add column media_type text check(media_type in('image','audio')), add column kind text not null default 'text' check(kind in('text','letter'));
alter table public.couple_messages add constraint message_attachment_scope check(attachment is null or (split_part(attachment,'/',1)=world_id::text and split_part(attachment,'/',2)=author_id::text and split_part(attachment,'/',3)='chat'));
create table public.couple_reads(world_id uuid not null references public.couple_worlds(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,read_at timestamptz not null default now(),primary key(world_id,user_id));
alter table public.couple_reads enable row level security;
create policy reads_view on public.couple_reads for select to authenticated using(private.is_couple_member(world_id));
create policy reads_write on public.couple_reads for insert to authenticated with check(user_id=auth.uid() and private.is_couple_member(world_id));
create policy reads_update on public.couple_reads for update to authenticated using(user_id=auth.uid() and private.is_couple_member(world_id)) with check(user_id=auth.uid() and private.is_couple_member(world_id));
grant select,insert,update on public.couple_reads to authenticated;
create table public.couple_reactions(message_id uuid not null references public.couple_messages(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,emoji text not null check(emoji in('♡','❤️','🥰','😂','✨')),primary key(message_id,user_id));
alter table public.couple_reactions enable row level security;
create policy reaction_read on public.couple_reactions for select to authenticated using(exists(select 1 from public.couple_messages m where m.id=message_id and private.is_couple_member(m.world_id)));
create policy reaction_write on public.couple_reactions for all to authenticated using(user_id=auth.uid() and exists(select 1 from public.couple_messages m where m.id=message_id and private.is_couple_member(m.world_id))) with check(user_id=auth.uid() and exists(select 1 from public.couple_messages m where m.id=message_id and private.is_couple_member(m.world_id)));
grant select,insert,update,delete on public.couple_reactions to authenticated;
create table public.couple_capsules(id uuid primary key default gen_random_uuid(),world_id uuid not null references public.couple_worlds(id) on delete cascade,title text not null check(length(title) between 1 and 100),body text not null check(length(body)<=6000),unlock_at timestamptz not null,published boolean not null default false,created_at timestamptz not null default now());
alter table public.couple_capsules enable row level security;
create policy capsule_read on public.couple_capsules for select to authenticated using(private.can_edit_world(world_id) or (private.is_couple_member(world_id) and published and unlock_at<=now()));
create policy capsule_insert on public.couple_capsules for insert to authenticated with check(private.can_edit_world(world_id));
create policy capsule_update on public.couple_capsules for update to authenticated using(private.can_edit_world(world_id)) with check(private.can_edit_world(world_id));
create policy capsule_delete on public.couple_capsules for delete to authenticated using(private.can_edit_world(world_id));
grant select,insert,update,delete on public.couple_capsules to authenticated;
create index capsule_world on public.couple_capsules(world_id);
create table public.couple_progress(world_id uuid not null references public.couple_worlds(id) on delete cascade,key text not null check(length(key)<=100),user_id uuid not null references auth.users(id) on delete cascade,value jsonb not null check(pg_column_size(value)<3000),updated_at timestamptz not null default now(),primary key(world_id,key,user_id));
alter table public.couple_progress enable row level security;
create policy progress_read on public.couple_progress for select to authenticated using(private.is_couple_member(world_id));
create policy progress_insert on public.couple_progress for insert to authenticated with check(user_id=auth.uid() and private.is_couple_member(world_id));
create policy progress_update on public.couple_progress for update to authenticated using(user_id=auth.uid() and private.is_couple_member(world_id)) with check(user_id=auth.uid() and private.is_couple_member(world_id));
grant select,insert,update on public.couple_progress to authenticated;
create policy world_realtime_read on realtime.messages for select to authenticated using(exists(select 1 from public.couple_worlds w where 'world:'||w.id::text=realtime.topic() and auth.uid() in(w.owner_id,w.partner_id)));
create policy world_realtime_write on realtime.messages for insert to authenticated with check(exists(select 1 from public.couple_worlds w where 'world:'||w.id::text=realtime.topic() and auth.uid() in(w.owner_id,w.partner_id)));
