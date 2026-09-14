import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { generateTest } from '@/services/ai/generate';

const schema = z.object({ subject: z.string().min(1).max(80), topic: z.string().max(120).optional(), difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'), count: z.number().int().min(5).max(20).default(10) });

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    const body = schema.parse(await req.json());
    const generated = await generateTest(body);
    const subject = await supabase.from('subjects').select('id').eq('name', body.subject).maybeSingle();
    const subjectId = subject.data?.id ?? body.subject.toLowerCase().slice(0, 40);
    const { data: test, error: testError } = await supabase.from('tests').insert({ user_id: user.id, subject_id: subjectId, title: generated.title, question_count: generated.questions.length }).select('id,title,question_count,subject_id').single();
    if (testError) throw testError;

    const rows = generated.questions.map((q) => ({ user_id: user.id, subject_id: subjectId, prompt: q.prompt, type: q.type, options: q.options, correct_answer: q.correct_answer, explanation: q.explanation, difficulty: q.difficulty }));
    const { data: questions, error: questionError } = await supabase.from('questions').insert(rows).select('id,prompt,type,options,difficulty');
    if (questionError || !questions) throw questionError ?? new Error('QUESTIONS_NOT_CREATED');
    const links = questions.map((q, index) => ({ test_id: test.id, question_id: q.id, position: index }));
    const { error: linkError } = await supabase.from('test_questions').insert(links);
    if (linkError) throw linkError;
    return NextResponse.json({ test: { ...test, questions } });
  } catch (error) {
    console.error(error);
    const message = error instanceof z.ZodError ? 'Некорректные параметры теста' : 'Не удалось создать тест';
    return NextResponse.json({ error: message }, { status: error instanceof z.ZodError ? 400 : 502 });
  }
}
