create extension if not exists "pgcrypto";

create table if not exists profiles(id uuid primary key references auth.users(id) on delete cascade,name text not null,age int,grade text,goal text,level text default 'beginner',locale text default 'ru',theme text default 'light',xp int default 0,streak int default 0,created_at timestamptz default now());
create table if not exists subjects(id text primary key,name text,icon text);
create table if not exists topics(id uuid primary key default gen_random_uuid(),subject_id text references subjects(id),name text,position int default 0);
create table if not exists user_subjects(user_id uuid references auth.users(id) on delete cascade,subject_id text references subjects(id),progress int default 0,primary key(user_id,subject_id));
create table if not exists questions(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete cascade,subject_id text,topic_id uuid,prompt text,type text,options jsonb,correct_answer text,explanation text,difficulty text);
create table if not exists answers(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete cascade,question_id uuid,answer text,correct boolean,feedback text);
create table if not exists tests(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete cascade,subject_id text,topic_id uuid,title text,question_count int);
create table if not exists test_questions(test_id uuid,question_id uuid,position int,primary key(test_id,question_id));
create table if not exists test_results(id uuid primary key default gen_random_uuid(),test_id uuid,user_id uuid references auth.users(id) on delete cascade,score int,correct_count int,time_seconds int);
create table if not exists ai_conversations(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete cascade,title text,subject_id text,created_at timestamptz default now());
create table if not exists ai_messages(id uuid primary key default gen_random_uuid(),conversation_id uuid,role text,content text,created_at timestamptz default now());
create table if not exists study_plans(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete cascade,title text,items jsonb);
create table if not exists study_sessions(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete cascade,subject_id text,minutes int,xp int,created_at timestamptz default now());
create table if not exists achievements(id uuid primary key default gen_random_uuid(),code text unique,title text,description text,xp int);
create table if not exists user_achievements(user_id uuid,achievement_id uuid,earned_at timestamptz default now(),primary key(user_id,achievement_id));
create table if not exists subscriptions(user_id uuid primary key,status text default 'free',provider text,customer_id text,subscription_id text,current_period_end timestamptz);
create table if not exists usage_limits(user_id uuid primary key,ai_messages_used int default 0,ai_messages_limit int default 30,photos_used int default 0,photos_limit int default 5);

insert into subjects values('math','Математика','∑'),('english','Английский','A'),('cs','Информатика','</>'),('physics','Физика','⚛'),('chemistry','Химия','⚗'),('biology','Биология','🧬'),('russian','Русский','АБ'),('history','История','⌛') on conflict do nothing;

alter table profiles enable row level security;
alter table user_subjects enable row level security;
alter table questions enable row level security;
alter table answers enable row level security;
alter table tests enable row level security;
alter table test_questions enable row level security;
alter table test_results enable row level security;
alter table ai_conversations enable row level security;
alter table ai_messages enable row level security;
alter table study_plans enable row level security;
alter table study_sessions enable row level security;
alter table user_achievements enable row level security;
alter table subscriptions enable row level security;
alter table usage_limits enable row level security;
alter table subjects enable row level security;
alter table topics enable row level security;
alter table achievements enable row level security;

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for all using(auth.uid()=id) with check(auth.uid()=id);
drop policy if exists "own subjects" on user_subjects;
create policy "own subjects" on user_subjects for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "own questions" on questions;
create policy "own questions" on questions for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "own answers" on answers;
create policy "own answers" on answers for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "own tests" on tests;
create policy "own tests" on tests for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "own test questions" on test_questions;
create policy "own test questions" on test_questions for all using(exists(select 1 from tests t where t.id=test_id and t.user_id=auth.uid())) with check(exists(select 1 from tests t where t.id=test_id and t.user_id=auth.uid()));
drop policy if exists "own test results" on test_results;
create policy "own test results" on test_results for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "own conversations" on ai_conversations;
create policy "own conversations" on ai_conversations for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "own messages" on ai_messages;
create policy "own messages" on ai_messages for all using(exists(select 1 from ai_conversations c where c.id=conversation_id and c.user_id=auth.uid())) with check(exists(select 1 from ai_conversations c where c.id=conversation_id and c.user_id=auth.uid()));
drop policy if exists "own plans" on study_plans;
create policy "own plans" on study_plans for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "own sessions" on study_sessions;
create policy "own sessions" on study_sessions for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "own achievements" on user_achievements;
create policy "own achievements" on user_achievements for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "own subscription" on subscriptions;
create policy "own subscription" on subscriptions for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "own limits" on usage_limits;
create policy "own limits" on usage_limits for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "public subjects" on subjects;
create policy "public subjects" on subjects for select using(true);
drop policy if exists "public topics" on topics;
create policy "public topics" on topics for select using(true);
drop policy if exists "public achievements" on achievements;
create policy "public achievements" on achievements for select using(true);

drop function if exists public.handle_new_user() cascade;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id,name) values(new.id,coalesce(new.raw_user_meta_data->>'name','Ученик')) on conflict (id) do nothing;
  insert into public.usage_limits(user_id) values(new.id) on conflict (user_id) do nothing;
  insert into public.subscriptions(user_id) values(new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
