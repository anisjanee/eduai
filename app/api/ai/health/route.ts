import { NextResponse } from 'next/server';

export async function GET() {
  const provider = process.env.AI_PROVIDER === 'openai' && process.env.OPENAI_API_KEY ? 'openai' : 'ollama';
  if (provider === 'openai') return NextResponse.json({ ok: true, provider: 'openai' });
  const baseUrl = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
  try {
    const r = await fetch(`${baseUrl}/api/tags`, { cache: 'no-store', signal: AbortSignal.timeout(3000) });
    if (!r.ok) return NextResponse.json({ ok: false, provider: 'ollama', error: 'Ollama недоступен' }, { status: 503 });
    const data = await r.json();
    const model = process.env.OLLAMA_MODEL || 'qwen2.5:7b';
    const ready = Array.isArray(data.models) && data.models.some((m: { name?: string }) => m.name === model || m.name?.startsWith(`${model}:`));
    return NextResponse.json({ ok: ready, provider: 'ollama', model, modelReady: ready }, { status: ready ? 200 : 503 });
  } catch { return NextResponse.json({ ok: false, provider: 'ollama', error: 'Ollama недоступен' }, { status: 503 }); }
}
