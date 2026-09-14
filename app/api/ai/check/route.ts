import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { checkAnswer } from '@/services/ai/generate';

const schema = z.object({ questionId: z.string().uuid(), question: z.string().min(1).max(6000), correctAnswer: z.string().min(1).max(2000), studentAnswer: z.string().trim().min(1).max(2000), explanation: z.string().max(6000).optional() });

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    const body = schema.parse(await req.json());
    const result = await checkAnswer(body);
    const { error } = await supabase.from('answers').insert({ user_id: user.id, question_id: body.questionId, answer: body.studentAnswer, correct: result.correct, feedback: result.feedback });
    if (error) throw error;
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    const message = error instanceof z.ZodError ? 'Некорректный ответ' : 'Не удалось проверить ответ';
    return NextResponse.json({ error: message }, { status: error instanceof z.ZodError ? 400 : 502 });
  }
}
