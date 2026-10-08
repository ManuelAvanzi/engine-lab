begin;
create table public.engine_projects (
 id uuid primary key,
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check(length(btrim(name)) between 1 and 100),
 document jsonb not null check(octet_length(document::text)<=32768),
 revision integer not null default 1 check(revision>0),
 updated_at timestamptz not null default now()
);
alter table public.engine_projects enable row level security;
create index engine_owner_updated on public.engine_projects(owner_id,updated_at desc);
create policy "Read own engine experiments" on public.engine_projects for select to authenticated using(owner_id=(select auth.uid()));
revoke all on public.engine_projects from anon, authenticated;
grant select on public.engine_projects to authenticated;
create function public.save_engine_project(project_id uuid,expected_revision integer,project_document jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare r integer; caller uuid:=auth.uid(); s jsonb:=project_document->'settings'; key text;
begin
 if caller is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if project_document->>'version' is distinct from '1' or jsonb_typeof(project_document->'name') is distinct from 'string'
 or jsonb_typeof(project_document->'notes') is distinct from 'string' or length(project_document->>'notes')>2000
 or jsonb_typeof(s) is distinct from 'object' then raise exception 'Invalid engine project' using errcode='22023'; end if;
 if (s->>'type') is null or s->>'type' not in ('ice','hybrid','ev') or (s->>'scenario') is null or s->>'scenario' not in ('city','mixed','highway','climb')
 or jsonb_typeof(s->'selected') is distinct from 'string' or jsonb_typeof(s->'parts') is distinct from 'object' then raise exception 'Invalid engine project' using errcode='22023'; end if;
 foreach key in array array['speed','load','ambient','explode','brightness'] loop
  if jsonb_typeof(s->key) is distinct from 'number' then raise exception 'Invalid engine project' using errcode='22023'; end if;
 end loop;
 if (s->>'speed')::numeric not between 0 and 100 or (s->>'load')::numeric not between 10 and 100 or (s->>'ambient')::numeric not between -10 and 45
 or (s->>'explode')::numeric not between 0 and 100 or (s->>'brightness')::numeric not between 0 and 100 then raise exception 'Invalid engine project' using errcode='22023'; end if;
 foreach key in array array['cooling','section','car'] loop
  if jsonb_typeof(s->key) is distinct from 'boolean' then raise exception 'Invalid engine project' using errcode='22023'; end if;
 end loop;
 if expected_revision=0 then
  insert into public.engine_projects(id,owner_id,name,document) values(project_id,caller,btrim(project_document->>'name'),project_document) returning revision into r;
 else
  update public.engine_projects set name=btrim(project_document->>'name'),document=project_document,revision=revision+1,updated_at=now()
  where id=project_id and owner_id=caller and revision=expected_revision returning revision into r;
  if r is null then raise exception 'Project conflict or unavailable'; end if;
 end if;
 return r;
end;
$$;
revoke all on function public.save_engine_project(uuid,integer,jsonb) from public, anon;
grant execute on function public.save_engine_project(uuid,integer,jsonb) to authenticated;
commit;
