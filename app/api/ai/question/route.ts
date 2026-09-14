import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { generateQuestion } from '@/services/ai/generate';

const schema = z.object({ subject: z.string().trim().min(1).max(80), topic: z.string().trim().max(120).optional(), difficulty: z.enum(['easy','medium','hard']).default('medium') });

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    const body = schema.parse(await req.json());
    const q = await generateQuestion(body);
    const { data, error } = await supabase.from('questions').insert({ user_id: user.id, subject_id: body.subject, prompt: q.prompt, type: q.type, options: q.options || [], correct_answer: q.correct_answer, explanation: q.explanation, difficulty: q.difficulty }).select('id,prompt,type,options,difficulty,subject_id').single();
    if (error) throw error;
    return NextResponse.json({ question: data });
  } catch (error) {
    console.error(error);
    const message = error instanceof z.ZodError ? 'Некорректные параметры' : 'Не удалось создать задачу. Проверь, запущен ли AI.';
    return NextResponse.json({ error: message }, { status: error instanceof z.ZodError ? 400 : 502 });
  }
}
