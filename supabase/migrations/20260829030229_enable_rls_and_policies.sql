revoke all on table public.profiles, public.user_snapshots from anon, authenticated;

grant usage on schema public to authenticated;
grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.user_snapshots to authenticated;

alter table public.profiles enable row level security;
alter table public.user_snapshots enable row level security;

create policy profiles_select_own
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy profiles_update_own
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy user_snapshots_select_own
on public.user_snapshots for select
to authenticated
using ((select auth.uid()) = user_id);

create policy user_snapshots_insert_own
on public.user_snapshots for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy user_snapshots_update_own
on public.user_snapshots for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy user_snapshots_delete_own
on public.user_snapshots for delete
to authenticated
using ((select auth.uid()) = user_id);
