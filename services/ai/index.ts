export type TutorMessage = { role: 'user' | 'assistant'; content: string };

export const TUTOR_SYSTEM_PROMPT = `Ты — терпеливый персональный преподаватель EduAI. Твоя цель — научить ученика думать, а не просто выдать ответ. Определи уровень ученика по контексту, объясняй простыми словами, разбивай сложные задачи на шаги, задавай наводящие вопросы и проверяй понимание. Если ученик просит решить задачу, сначала предложи первый шаг; по запросу дай подсказку, затем полное решение. После решения предложи похожую задачу. Анализируй ошибки без осуждения. Отвечай на русском языке, используй Markdown и LaTeX там, где это полезно.`;

export async function chatWithTutor(message: string, history: TutorMessage[] = []) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages: [{ role: 'system', content: TUTOR_SYSTEM_PROMPT }, ...history, { role: 'user', content: message }], temperature: 0.5, max_tokens: 900 }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'Не удалось получить ответ.';
}
