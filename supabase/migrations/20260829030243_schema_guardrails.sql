alter table public.user_snapshots
  add constraint user_snapshots_schema_version_valid
    check (schema_version >= 1),
  add constraint user_snapshots_revision_valid
    check (revision >= 0),
  add constraint user_snapshots_state_shape_valid
    check (
      jsonb_typeof(state) = 'object'
      and state ? 'tasks' and jsonb_typeof(state -> 'tasks') = 'array'
      and state ? 'events' and jsonb_typeof(state -> 'events') = 'array'
      and state ? 'rewards' and jsonb_typeof(state -> 'rewards') = 'array'
      and state ? 'punishments' and jsonb_typeof(state -> 'punishments') = 'array'
      and state ? 'settings' and jsonb_typeof(state -> 'settings') = 'object'
    ),
  add constraint user_snapshots_state_size_valid
    check (octet_length(state::text) <= 2097152);

create or replace function private.prepare_snapshot_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.user_id = old.user_id;
  new.created_at = old.created_at;
  new.revision = old.revision + 1;
  return new;
end;
$$;

revoke all on function private.prepare_snapshot_update() from public, anon, authenticated;

create trigger user_snapshots_prepare_update
before update on public.user_snapshots
for each row execute function private.prepare_snapshot_update();
