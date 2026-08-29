begin;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-a@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-b@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('33333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-c@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

do $$
begin
  if (select count(*) from public.profiles where id in (
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333'
  )) <> 3 then
    raise exception 'auth profile trigger did not create all profile rows';
  end if;
end;
$$;

insert into public.user_snapshots (user_id, state)
values
  ('11111111-1111-4111-8111-111111111111', '{"tasks":[],"events":[],"rewards":[],"punishments":[],"settings":{}}'),
  ('22222222-2222-4222-8222-222222222222', '{"tasks":[],"events":[],"rewards":[],"punishments":[],"settings":{}}');

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  own_count integer;
  other_count integer;
  affected integer;
  current_revision bigint;
begin
  select count(*) into own_count
  from public.user_snapshots
  where user_id = '11111111-1111-4111-8111-111111111111';

  select count(*) into other_count
  from public.user_snapshots
  where user_id = '22222222-2222-4222-8222-222222222222';

  if own_count <> 1 or other_count <> 0 then
    raise exception 'RLS select isolation failed: own %, other %', own_count, other_count;
  end if;

  update public.user_snapshots
  set state = '{"tasks":[],"events":[],"rewards":[],"punishments":[],"settings":{"tested":true}}'
  where user_id = '11111111-1111-4111-8111-111111111111';
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'own update was not allowed';
  end if;

  select revision into current_revision
  from public.user_snapshots
  where user_id = '11111111-1111-4111-8111-111111111111';
  if current_revision <> 1 then
    raise exception 'revision trigger failed: %', current_revision;
  end if;

  update public.user_snapshots
  set state = '{"tasks":[],"events":[],"rewards":[],"punishments":[],"settings":{"cross_write":true}}'
  where user_id = '22222222-2222-4222-8222-222222222222';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'cross-user update unexpectedly succeeded';
  end if;

  delete from public.user_snapshots
  where user_id = '22222222-2222-4222-8222-222222222222';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'cross-user delete unexpectedly succeeded';
  end if;

  begin
    insert into public.user_snapshots (user_id, state)
    values ('33333333-3333-4333-8333-333333333333', '{"tasks":[],"events":[],"rewards":[],"punishments":[],"settings":{}}');
    raise exception 'cross-user insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
set local role anon;

do $$
begin
  begin
    perform count(*) from public.user_snapshots;
    raise exception 'anon select unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
rollback;

select 'rls_and_trigger_checks_passed' as result;
