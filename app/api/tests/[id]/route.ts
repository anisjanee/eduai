import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({ answers: z.array(z.object({ questionId: z.string().uuid(), answer: z.string().trim().max(2000) })).max(20), timeSeconds: z.number().int().min(0).max(7200).default(0) });

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
  const { id } = await context.params;
  const { data: test, error } = await supabase.from('tests').select('id,title,question_count,subject_id').eq('id', id).eq('user_id', user.id).single();
  if (error || !test) return NextResponse.json({ error: 'Тест не найден' }, { status: 404 });
  const { data: links } = await supabase.from('test_questions').select('question_id,position').eq('test_id', id).order('position');
  const ids = (links ?? []).map((link) => link.question_id);
  const { data: questions } = ids.length ? await supabase.from('questions').select('id,prompt,type,options,difficulty').in('id', ids).eq('user_id', user.id) : { data: [] };
  const order = new Map((links ?? []).map((link) => [link.question_id, link.position]));
  questions?.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return NextResponse.json({ test, questions: questions ?? [] });
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    const { id } = await context.params;
    const body = schema.parse(await req.json());
    const { data: test } = await supabase.from('tests').select('id').eq('id', id).eq('user_id', user.id).single();
    if (!test) return NextResponse.json({ error: 'Тест не найден' }, { status: 404 });
    const { data: links } = await supabase.from('test_questions').select('question_id').eq('test_id', id);
    const ids = (links ?? []).map((link) => link.question_id);
    const { data: questions } = await supabase.from('questions').select('id,correct_answer,explanation').in('id', ids).eq('user_id', user.id);
    const questionMap = new Map((questions ?? []).map((q) => [q.id, q]));
    const results = body.answers.map((item) => { const q = questionMap.get(item.questionId); const correct = q ? item.answer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase() : false; return { ...item, correct, explanation: q?.explanation ?? '' }; });
    const correctCount = results.filter((item) => item.correct).length;
    const score = ids.length ? Math.round((correctCount / ids.length) * 100) : 0;
    const { data: result, error } = await supabase.from('test_results').insert({ test_id: id, user_id: user.id, score, correct_count: correctCount, time_seconds: body.timeSeconds }).select('id,score,correct_count,time_seconds').single();
    if (error) throw error;
    const answerRows = results.map((item) => ({ user_id: user.id, question_id: item.questionId, answer: item.answer, correct: item.correct, feedback: item.correct ? 'Правильно!' : item.explanation }));
    if (answerRows.length) await supabase.from('answers').insert(answerRows);
    return NextResponse.json({ result, results });
  } catch (error) {
    console.error(error);
    const message = error instanceof z.ZodError ? 'Некорректные ответы' : 'Не удалось завершить тест';
    return NextResponse.json({ error: message }, { status: error instanceof z.ZodError ? 400 : 502 });
  }
}
