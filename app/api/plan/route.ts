import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { generateStudyPlan } from '@/services/ai/generate';

const schema = z.object({ regenerate: z.boolean().optional().default(false) });

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    const { data: plan, error } = await supabase.from('study_plans').select('id,title,items,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ plan });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Не удалось загрузить учебный план' }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });

    schema.parse(await req.json().catch(() => ({})));

    const [{ data: profile }, { data: selectedSubjects }, { data: topics }] = await Promise.all([
      supabase.from('profiles').select('goal,grade').eq('id', user.id).single(),
      supabase.from('user_subjects').select('subject_id,progress').eq('user_id', user.id).order('progress', { ascending: true }),
      supabase.from('topics').select('id,name,subject_id'),
    ]);

    const subjectIds = (selectedSubjects ?? []).map((item) => item.subject_id);
    const { data: subjects } = await supabase.from('subjects').select('id,name').in('id', subjectIds.length ? subjectIds : ['math']);
    const names = (subjects ?? []).map((item) => item.name).filter(Boolean) as string[];
    const weakSubjectIds = (selectedSubjects ?? []).filter((item) => (item.progress ?? 0) < 50).map((item) => item.subject_id);
    const weakTopics = (topics ?? []).filter((topic) => weakSubjectIds.includes(topic.subject_id)).slice(0, 8).map((topic) => topic.name).filter(Boolean) as string[];

    const items = await generateStudyPlan({ subjects: names, goal: profile?.goal ?? undefined, grade: profile?.grade ?? undefined, weakTopics });
    const title = `План на неделю · ${new Date().toLocaleDateString('ru-RU')}`;
    const { data: plan, error } = await supabase.from('study_plans').insert({ user_id: user.id, title, items }).select('id,title,items,created_at').single();
    if (error) throw error;

    return NextResponse.json({ plan });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Не удалось создать учебный план' }, { status: 502 });
  }
}
