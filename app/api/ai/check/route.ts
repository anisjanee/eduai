import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { checkAnswer } from '@/services/ai/generate';

const schema = z.object({ questionId: z.string().uuid(), studentAnswer: z.string().trim().min(1).max(2000) });

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    const body = schema.parse(await req.json());
    const { data: question, error: questionError } = await supabase.from('questions').select('id,prompt,correct_answer,explanation').eq('id', body.questionId).eq('user_id', user.id).single();
    if (questionError || !question) return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 });
    const result = await checkAnswer({ question: question.prompt, correctAnswer: question.correct_answer, studentAnswer: body.studentAnswer, explanation: question.explanation });
    const { error } = await supabase.from('answers').insert({ user_id: user.id, question_id: body.questionId, answer: body.studentAnswer, correct: result.correct, feedback: result.feedback });
    if (error) throw error;
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    const message = error instanceof z.ZodError ? 'Некорректный ответ' : 'Не удалось проверить ответ';
    return NextResponse.json({ error: message }, { status: error instanceof z.ZodError ? 400 : 502 });
  }
}
