-- Apply once to an existing configured Supabase project before choosing Avatar online.
begin;
alter table public.sc_members drop constraint if exists sc_members_fighter_check;
alter table public.sc_members add constraint sc_members_fighter_check check(fighter in ('capoeira','magic','soldier','archer','greatsword','axe','paladin','avatar'));
commit;
