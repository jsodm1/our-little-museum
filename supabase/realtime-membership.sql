-- Rotate the private channel when access changes; old channels receive no future updates.
alter table public.couple_worlds add column realtime_key uuid not null default gen_random_uuid();
alter policy world_realtime_read on realtime.messages using(exists(select 1 from public.couple_worlds w where 'world:'||w.id::text||':'||w.realtime_key::text=realtime.topic() and auth.uid() in(w.owner_id,w.partner_id)));
alter policy world_realtime_write on realtime.messages with check(exists(select 1 from public.couple_worlds w where 'world:'||w.id::text||':'||w.realtime_key::text=realtime.topic() and auth.uid() in(w.owner_id,w.partner_id)));
create or replace function private.manage_partner(world_id uuid,remove_partner boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.can_edit_world(world_id) then raise exception 'Only the owner manages access'; end if;
 update public.couple_worlds set invite_hash=null,invite_expires=null,partner_id=case when remove_partner then null else partner_id end,realtime_key=case when remove_partner then gen_random_uuid() else realtime_key end where id=world_id;
 if remove_partner then delete from public.couple_presence where couple_presence.world_id=manage_partner.world_id and user_id<>auth.uid(); end if;
end $$;
