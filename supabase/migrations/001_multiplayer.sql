-- Run once in the Supabase SQL Editor. No service-role key is needed by the game.
begin;
create table public.sc_rooms (
 id uuid primary key default gen_random_uuid(),
 code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
 host_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'lobby' check(status in ('lobby','playing','closed')),
 match_id uuid, created_at timestamptz not null default now()
);
create table public.sc_members (
 room_id uuid not null references public.sc_rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 display_name text not null check(length(display_name) between 1 and 20),
 fighter text not null check(fighter in ('capoeira','magic','soldier','archer','greatsword','axe','paladin','avatar')),
 ready boolean not null default false, joined_at timestamptz not null default now(),last_seen timestamptz not null default now(),
 primary key(room_id,user_id),unique(user_id)
);
alter table public.sc_rooms enable row level security;
alter table public.sc_members enable row level security;
create function public.sc_is_member(p_room text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.sc_members m join public.sc_rooms r on r.id=m.room_id where r.id::text=p_room and m.user_id=auth.uid() and r.status<>'closed');
$$;
revoke all on function public.sc_is_member(text) from public,anon;
grant execute on function public.sc_is_member(text) to authenticated;
create policy sc_room_read on public.sc_rooms for select to authenticated using(public.sc_is_member(id::text));
create policy sc_member_read on public.sc_members for select to authenticated using(public.sc_is_member(room_id::text));
revoke all on public.sc_rooms,public.sc_members from anon,authenticated;
grant select on public.sc_rooms,public.sc_members to authenticated;

create function public.sc_leave_room(p_room uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 perform 1 from public.sc_rooms where id=p_room for update;
 update public.sc_rooms set status='closed' where id=p_room and host_id=auth.uid();
 delete from public.sc_members where room_id=p_room and user_id=auth.uid();
end;$$;
create function public.sc_create_room(p_name text,p_fighter text) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid; oldroom uuid;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 -- Serialize concurrent requests by the same guest, including requests on two tabs.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select room_id into oldroom from public.sc_members where user_id=auth.uid();
 if oldroom is not null then perform public.sc_leave_room(oldroom); end if;
 insert into public.sc_rooms(host_id) values(auth.uid()) returning id into rid;
 insert into public.sc_members(room_id,user_id,display_name,fighter) values(rid,auth.uid(),coalesce(nullif(left(btrim(p_name),20),''),'Fighter'),p_fighter);
 return rid;
end;$$;
create function public.sc_join_room(p_code text,p_name text,p_fighter text) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.sc_rooms; oldroom uuid;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select * into r from public.sc_rooms where code=upper(btrim(p_code)) and status='lobby' and created_at>now()-interval '1 day' for update;
 if not found then raise exception 'Room unavailable or already playing'; end if;
 if not exists(select 1 from public.sc_members where room_id=r.id and user_id=r.host_id and last_seen>now()-interval '45 seconds') then raise exception 'Room host is offline'; end if;
 if exists(select 1 from public.sc_members where room_id=r.id and user_id=auth.uid()) then return r.id; end if;
 delete from public.sc_members where room_id=r.id and user_id<>r.host_id and last_seen<now()-interval '45 seconds';
 if (select count(*) from public.sc_members where room_id=r.id)>=4 then raise exception 'Room is full (4 players)'; end if;
 select room_id into oldroom from public.sc_members where user_id=auth.uid();
 if oldroom is not null then perform public.sc_leave_room(oldroom); end if;
 insert into public.sc_members(room_id,user_id,display_name,fighter) values(r.id,auth.uid(),coalesce(nullif(left(btrim(p_name),20),''),'Fighter'),p_fighter);
 return r.id;
end;$$;
create function public.sc_update_member(p_room uuid,p_fighter text,p_ready boolean,p_name text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.sc_rooms where id=p_room and status='lobby' for update;
 if not found then raise exception 'Room is not in the lobby'; end if;
 update public.sc_members set ready=coalesce(p_ready,false),fighter=p_fighter,display_name=coalesce(nullif(left(btrim(p_name),20),''),'Fighter'),last_seen=now() where room_id=p_room and user_id=auth.uid();
 if not found then raise exception 'Join the room first'; end if;
end;$$;
create function public.sc_start_match(p_room uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare mid uuid;
begin
 perform 1 from public.sc_rooms where id=p_room and host_id=auth.uid() and status='lobby' for update;
 if not found then raise exception 'Only the host can start a lobby'; end if;
 delete from public.sc_members where room_id=p_room and user_id<>auth.uid() and last_seen<now()-interval '45 seconds';
 if (select count(*) from public.sc_members where room_id=p_room)<2 then raise exception 'At least two players are needed'; end if;
 if exists(select 1 from public.sc_members where room_id=p_room and not ready) then raise exception 'Every player must be ready'; end if;
 mid=gen_random_uuid();update public.sc_rooms set status='playing',match_id=mid where id=p_room;return mid;
end;$$;
create function public.sc_finish_match(p_room uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.sc_rooms where id=p_room and host_id=auth.uid() and status='playing' for update;
 if not found then raise exception 'Only the host can finish an active match'; end if;
 update public.sc_rooms set status='lobby' where id=p_room;
 update public.sc_members set ready=false where room_id=p_room;
end;$$;
create function public.sc_heartbeat(p_room uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.sc_members set last_seen=now() where room_id=p_room and user_id=auth.uid();
 if not found then raise exception 'Room membership ended'; end if;
 update public.sc_rooms r set status='closed' where r.id=p_room and exists(select 1 from public.sc_members m where m.room_id=r.id and m.user_id=auth.uid()) and not exists(select 1 from public.sc_members h where h.room_id=r.id and h.user_id=r.host_id and h.last_seen>now()-interval '45 seconds');
end;$$;
-- Nobody may use these privileged functions except signed-in users. All writes
-- remain inside the functions; no client can set a room's host or bypass capacity.
revoke all on function public.sc_leave_room(uuid),public.sc_create_room(text,text),public.sc_join_room(text,text,text),public.sc_update_member(uuid,text,boolean,text),public.sc_start_match(uuid),public.sc_finish_match(uuid),public.sc_heartbeat(uuid) from public,anon;
grant execute on function public.sc_leave_room(uuid),public.sc_create_room(text,text),public.sc_join_room(text,text,text),public.sc_update_member(uuid,text,boolean,text),public.sc_start_match(uuid),public.sc_finish_match(uuid),public.sc_heartbeat(uuid) to authenticated;
-- Separate sender topics prevent a guest from publishing as the room's host.
-- sc:<room UUID>:<sender UUID>. Members can read; only the sender can write.
create policy sc_broadcast_read on realtime.messages for select to authenticated using(
 extension='broadcast' and split_part(realtime.topic(),':',1)='sc' and public.sc_is_member(split_part(realtime.topic(),':',2))
 and exists(select 1 from public.sc_members m where m.room_id::text=split_part(realtime.topic(),':',2) and m.user_id::text=split_part(realtime.topic(),':',3))
);
create policy sc_broadcast_write on realtime.messages for insert to authenticated with check(
 extension='broadcast' and split_part(realtime.topic(),':',1)='sc' and split_part(realtime.topic(),':',3)=auth.uid()::text and public.sc_is_member(split_part(realtime.topic(),':',2))
);
commit;
