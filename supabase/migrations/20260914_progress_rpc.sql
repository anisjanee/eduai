-- EduAI progress engine: atomic XP + subject progress updates.
create or replace function public.record_practice_answer(
  p_question_id uuid,
  p_correct boolean
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_subject text;
  v_xp int;
  v_progress int;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;

  select subject_id into v_subject
  from public.questions
  where id = p_question_id and user_id = v_user;
  if v_subject is null then raise exception 'QUESTION_NOT_FOUND'; end if;

  insert into public.study_sessions(user_id, subject_id, minutes, xp)
  values (v_user, v_subject, 1, case when p_correct then 20 else 5 end);

  update public.profiles
  set xp = coalesce(xp, 0) + case when p_correct then 20 else 5 end
  where id = v_user
  returning xp into v_xp;

  insert into public.user_subjects(user_id, subject_id, progress)
  values (v_user, v_subject, case when p_correct then 2 else 0 end)
  on conflict (user_id, subject_id) do update
  set progress = least(100, greatest(0, public.user_subjects.progress + case when p_correct then 2 else 0 end));

  select progress into v_progress from public.user_subjects
  where user_id = v_user and subject_id = v_subject;

  return jsonb_build_object('xp', v_xp, 'subject_id', v_subject, 'progress', v_progress, 'earned_xp', case when p_correct then 20 else 5 end);
end;
$$;

grant execute on function public.record_practice_answer(uuid, boolean) to authenticated;
