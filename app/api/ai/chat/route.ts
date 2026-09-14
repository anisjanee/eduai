import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { chatWithTutor } from '@/services/ai';

const schema = z.object({
  message: z.string().trim().min(1).max(6000),
  history: z.array(z.object({ role: z.enum(['user','assistant']), content: z.string().max(6000) })).max(30).default([]),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    const body = schema.parse(await req.json());
    const reply = await chatWithTutor(body.message, body.history);
    return NextResponse.json({ reply });
  } catch (error) {
    const message = error instanceof z.ZodError ? 'Некорректный запрос' : 'AI временно недоступен';
    const status = error instanceof z.ZodError ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
