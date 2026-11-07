create extension if not exists pgcrypto with schema extensions;

create table public.couple_worlds (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  partner_id uuid references auth.users(id) on delete set null,
  partner_can_edit boolean not null default false,
  state jsonb not null,
  revision integer not null default 1,
  invite_hash text,
  invite_expires timestamptz,
  updated_at timestamptz not null default now(),
  check (partner_id is distinct from owner_id),
  check (pg_column_size(state) < 400000)
);
create table public.couple_messages (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.couple_worlds(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check(length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index couple_message_world_time on public.couple_messages(world_id,created_at desc);
alter table public.couple_worlds enable row level security;
alter table public.couple_messages enable row level security;

create function public.is_couple_member(w uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.couple_worlds where id=w and auth.uid() in (owner_id,partner_id));
$$;
create function public.can_edit_world(w uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.couple_worlds where id=w and (auth.uid()=owner_id or (auth.uid()=partner_id and partner_can_edit)));
$$;
create policy world_members_read on public.couple_worlds for select to authenticated using (auth.uid() in(owner_id,partner_id));
create policy message_members_read on public.couple_messages for select to authenticated using(public.is_couple_member(world_id));
create policy message_members_write on public.couple_messages for insert to authenticated with check(auth.uid()=author_id and public.is_couple_member(world_id));

create function public.valid_couple_state(s jsonb) returns boolean language sql immutable set search_path='' as $$
 select coalesce(s->>'version'='2' and jsonb_typeof(s->'couple')='array' and jsonb_array_length(s->'couple')=2 and jsonb_typeof(s->'memories')='array' and jsonb_array_length(s->'memories') between 1 and 30 and pg_column_size(s)<400000,false);
$$;
create function public.create_couple_world(initial_state jsonb) returns public.couple_worlds language plpgsql security definer set search_path='' as $$
declare result public.couple_worlds;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  if (select count(*) from public.couple_worlds where owner_id=auth.uid())>=3 then raise exception 'You can own up to three worlds'; end if;
  if not public.valid_couple_state(initial_state) then raise exception 'Invalid world'; end if;
  insert into public.couple_worlds(owner_id,state) values(auth.uid(),initial_state) returning * into result;
  return result;
end $$;
create function public.publish_couple_world(world_id uuid, expected_revision integer, next_state jsonb) returns public.couple_worlds language plpgsql security definer set search_path='' as $$
declare result public.couple_worlds;
begin
 if not public.can_edit_world(world_id) then raise exception 'The owner has not enabled editing for this account'; end if;
 if not public.valid_couple_state(next_state) then raise exception 'Invalid world'; end if;
 update public.couple_worlds set state=next_state,revision=revision+1,updated_at=now() where id=world_id and revision=expected_revision returning * into result;
 if result.id is null then raise exception 'This world changed on another device. Reload the published version before saving.'; end if;
 return result;
end $$;
create function public.set_partner_permission(world_id uuid, allow_edit boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.couple_worlds set partner_can_edit=allow_edit where id=world_id and owner_id=auth.uid();
 if not found then raise exception 'Only the world owner can change this permission'; end if;
end $$;
create function public.invite_partner(world_id uuid, invite_secret text) returns void language plpgsql security definer set search_path='' as $$
begin
 if length(invite_secret)<40 then raise exception 'Invalid invitation'; end if;
 update public.couple_worlds set invite_hash=encode(extensions.digest(invite_secret,'sha256'),'hex'),invite_expires=now()+interval '2 days' where id=world_id and owner_id=auth.uid() and partner_id is null;
 if not found then raise exception 'Only an owner with an empty partner place can invite'; end if;
end $$;
create function public.accept_partner_invite(world_id uuid, invite_secret text) returns public.couple_worlds language plpgsql security definer set search_path='' as $$
declare result public.couple_worlds;
begin
 if auth.uid() is null then raise exception 'Sign in to accept'; end if;
 update public.couple_worlds set partner_id=auth.uid(),invite_hash=null,invite_expires=null
 where id=world_id and partner_id is null and owner_id<>auth.uid() and invite_expires>now() and invite_hash=encode(extensions.digest(invite_secret,'sha256'),'hex')
 returning * into result;
 if result.id is null then raise exception 'This invitation was used, expired or is not valid'; end if;
 return result;
end $$;
create function public.update_my_avatar(world_id uuid, avatar jsonb) returns public.couple_worlds language plpgsql security definer set search_path='' as $$
declare result public.couple_worlds; avatar_index text;
begin
 select * into result from public.couple_worlds where id=world_id for update;
 if auth.uid() is null or not public.is_couple_member(world_id) then raise exception 'Access denied'; end if;
 if jsonb_typeof(avatar)<>'object' or coalesce(length(avatar->>'name'),0) not between 1 and 40 or pg_column_size(avatar)>15000 then raise exception 'Invalid avatar'; end if;
 avatar_index=case when auth.uid()=result.owner_id then '0' else '1' end;
 update public.couple_worlds set state=jsonb_set(state,array['couple',avatar_index],avatar),revision=revision+1,updated_at=now() where id=world_id returning * into result;
 return result;
end $$;
revoke all on function public.create_couple_world(jsonb), public.publish_couple_world(uuid,integer,jsonb), public.set_partner_permission(uuid,boolean), public.invite_partner(uuid,text), public.accept_partner_invite(uuid,text), public.update_my_avatar(uuid,jsonb) from public,anon;
grant execute on function public.create_couple_world(jsonb), public.publish_couple_world(uuid,integer,jsonb), public.set_partner_permission(uuid,boolean), public.invite_partner(uuid,text), public.accept_partner_invite(uuid,text), public.update_my_avatar(uuid,jsonb) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('couple-media','couple-media',false,12582912,array['image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','audio/wav','audio/ogg','audio/webm'])
on conflict(id) do nothing;
create policy couple_media_read on storage.objects for select to authenticated using(
 bucket_id='couple-media' and public.is_couple_member(((storage.foldername(name))[1])::uuid)
);
create policy couple_media_insert on storage.objects for insert to authenticated with check(
 bucket_id='couple-media' and (storage.foldername(name))[2]=auth.uid()::text
 and public.is_couple_member(((storage.foldername(name))[1])::uuid)
 and ((storage.foldername(name))[3]='avatar' or public.can_edit_world(((storage.foldername(name))[1])::uuid))
);
create policy couple_media_delete on storage.objects for delete to authenticated using(bucket_id='couple-media' and owner_id=auth.uid()::text);
create index couple_world_owner on public.couple_worlds(owner_id);
create index couple_world_partner on public.couple_worlds(partner_id);
create index couple_message_author on public.couple_messages(author_id);
grant select on public.couple_worlds to authenticated;
grant select,insert on public.couple_messages to authenticated;
revoke execute on function public.is_couple_member(uuid),public.can_edit_world(uuid),public.valid_couple_state(jsonb) from public,anon;
grant execute on function public.is_couple_member(uuid),public.can_edit_world(uuid),public.valid_couple_state(jsonb) to authenticated;

create schema if not exists private;
create table private.account_recovery(user_id uuid primary key references auth.users(id) on delete cascade,token_hash text not null);
create table private.account_limits(key text primary key,started timestamptz not null default now(),attempts integer not null default 1);
alter table private.account_recovery enable row level security;
alter table private.account_limits enable row level security;
create function public.account_rate_limit(rate_key text, maximum integer) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 insert into private.account_limits(key) values(rate_key) on conflict(key) do update set
 attempts=case when private.account_limits.started<now()-interval '1 hour' then 1 else private.account_limits.attempts+1 end,
 started=case when private.account_limits.started<now()-interval '1 hour' then now() else private.account_limits.started end returning attempts into n;
 delete from private.account_limits where started<now()-interval '2 days';
 return n<=maximum;
end $$;
create function public.account_set_recovery(uid uuid,hash text) returns void language sql security definer set search_path='' as $$
 insert into private.account_recovery values(uid,hash) on conflict(user_id) do update set token_hash=excluded.token_hash;
$$;
create function public.account_recover(hash text) returns uuid language sql security definer set search_path='' as $$
 select user_id from private.account_recovery where token_hash=hash;
$$;
revoke all on function public.account_rate_limit(text,integer),public.account_set_recovery(uuid,text),public.account_recover(text) from public,anon,authenticated;
grant execute on function public.account_rate_limit(text,integer),public.account_set_recovery(uuid,text),public.account_recover(text) to service_role;

create table public.couple_presence (
 world_id uuid not null references public.couple_worlds(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 payload jsonb not null default '{}',
 updated_at timestamptz not null default now(),
 primary key(world_id,user_id),
 check(pg_column_size(payload)<8000)
);
alter table public.couple_presence enable row level security;
create policy presence_read on public.couple_presence for select to authenticated using(public.is_couple_member(world_id));
create policy presence_insert on public.couple_presence for insert to authenticated with check(user_id=(select auth.uid()) and public.is_couple_member(world_id));
create policy presence_update on public.couple_presence for update to authenticated using(user_id=(select auth.uid()) and public.is_couple_member(world_id)) with check(user_id=(select auth.uid()) and public.is_couple_member(world_id));
grant select,insert,update on public.couple_presence to authenticated;
create index presence_user on public.couple_presence(user_id);
create function public.touch_couple_presence() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
create trigger touch_presence before insert or update on public.couple_presence for each row execute function public.touch_couple_presence();
revoke all on schema private from public,anon; grant usage on schema private to authenticated,service_role;
alter function public.is_couple_member(w uuid) set schema private;
create function public.is_couple_member(w uuid) returns boolean language sql security invoker set search_path='' as $$ select private.is_couple_member(w); $$;
revoke all on function public.is_couple_member(w uuid) from public,anon;
grant execute on function public.is_couple_member(w uuid) to authenticated;
alter function public.can_edit_world(w uuid) set schema private;
create function public.can_edit_world(w uuid) returns boolean language sql security invoker set search_path='' as $$ select private.can_edit_world(w); $$;
revoke all on function public.can_edit_world(w uuid) from public,anon;
grant execute on function public.can_edit_world(w uuid) to authenticated;
alter function public.create_couple_world(initial_state jsonb) set schema private;
create function public.create_couple_world(initial_state jsonb) returns public.couple_worlds language sql security invoker set search_path='' as $$ select private.create_couple_world(initial_state); $$;
revoke all on function public.create_couple_world(initial_state jsonb) from public,anon;
grant execute on function public.create_couple_world(initial_state jsonb) to authenticated;
alter function public.publish_couple_world(world_id uuid, expected_revision integer, next_state jsonb) set schema private;
create function public.publish_couple_world(world_id uuid, expected_revision integer, next_state jsonb) returns public.couple_worlds language sql security invoker set search_path='' as $$ select private.publish_couple_world(world_id,expected_revision,next_state); $$;
revoke all on function public.publish_couple_world(world_id uuid, expected_revision integer, next_state jsonb) from public,anon;
grant execute on function public.publish_couple_world(world_id uuid, expected_revision integer, next_state jsonb) to authenticated;
alter function public.set_partner_permission(world_id uuid, allow_edit boolean) set schema private;
create function public.set_partner_permission(world_id uuid, allow_edit boolean) returns void language sql security invoker set search_path='' as $$ select private.set_partner_permission(world_id,allow_edit); $$;
revoke all on function public.set_partner_permission(world_id uuid, allow_edit boolean) from public,anon;
grant execute on function public.set_partner_permission(world_id uuid, allow_edit boolean) to authenticated;
alter function public.invite_partner(world_id uuid, invite_secret text) set schema private;
create function public.invite_partner(world_id uuid, invite_secret text) returns void language sql security invoker set search_path='' as $$ select private.invite_partner(world_id,invite_secret); $$;
revoke all on function public.invite_partner(world_id uuid, invite_secret text) from public,anon;
grant execute on function public.invite_partner(world_id uuid, invite_secret text) to authenticated;
alter function public.accept_partner_invite(world_id uuid, invite_secret text) set schema private;
create function public.accept_partner_invite(world_id uuid, invite_secret text) returns public.couple_worlds language sql security invoker set search_path='' as $$ select private.accept_partner_invite(world_id,invite_secret); $$;
revoke all on function public.accept_partner_invite(world_id uuid, invite_secret text) from public,anon;
grant execute on function public.accept_partner_invite(world_id uuid, invite_secret text) to authenticated;
alter function public.update_my_avatar(world_id uuid, avatar jsonb) set schema private;
create function public.update_my_avatar(world_id uuid, avatar jsonb) returns public.couple_worlds language sql security invoker set search_path='' as $$ select private.update_my_avatar(world_id,avatar); $$;
revoke all on function public.update_my_avatar(world_id uuid, avatar jsonb) from public,anon;
grant execute on function public.update_my_avatar(world_id uuid, avatar jsonb) to authenticated;
