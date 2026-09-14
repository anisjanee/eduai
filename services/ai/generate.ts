import { TUTOR_SYSTEM_PROMPT, type TutorMessage } from './index';

export type GeneratedQuestion = {
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'short' | 'multiple_choice';
  prompt: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
};

async function providerText(messages: TutorMessage[]) {
  const provider = process.env.AI_PROVIDER === 'openai' && process.env.OPENAI_API_KEY ? 'openai' : 'ollama';
  if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, cache: 'no-store',
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages, temperature: 0.3, max_tokens: 1200 }),
    });
    if (!response.ok) throw new Error(`AI_PROVIDER_ERROR:${response.status}`);
    const data = await response.json(); return data.choices?.[0]?.message?.content || '';
  }
  const baseUrl = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
    body: JSON.stringify({ model: process.env.OLLAMA_MODEL || 'qwen2.5:7b', stream: false, messages, options: { temperature: 0.3 } }),
  });
  if (!response.ok) throw new Error(`AI_PROVIDER_ERROR:${response.status}`);
  const data = await response.json(); return data.message?.content || '';
}

function parseJson(text: string) {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = cleaned.indexOf('{'); const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('AI_INVALID_JSON');
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function generateQuestion(input: { subject: string; topic?: string; difficulty?: string }): Promise<GeneratedQuestion> {
  const prompt = `Создай одну учебную задачу для ученика. Предмет: ${input.subject}. Тема: ${input.topic || 'выбери подходящую базовую тему'}. Сложность: ${input.difficulty || 'medium'}.
Верни ТОЛЬКО JSON без markdown по схеме: {"subject":"...","topic":"...","difficulty":"easy|medium|hard","type":"short|multiple_choice","prompt":"...","options":["..."],"correct_answer":"...","explanation":"..."}. Для short options должен быть []. Объяснение должно быть понятным ученику.`;
  const text = await providerText([{ role: 'system', content: TUTOR_SYSTEM_PROMPT }, { role: 'user', content: prompt }]);
  const q = parseJson(text);
  if (!q.prompt || !q.correct_answer || !q.explanation) throw new Error('AI_INVALID_QUESTION');
  return q as GeneratedQuestion;
}

export async function checkAnswer(input: { question: string; correctAnswer: string; studentAnswer: string; explanation?: string }) {
  const prompt = `Проверь ответ ученика. Задача: ${input.question}\nПравильный ответ: ${input.correctAnswer}\nОтвет ученика: ${input.studentAnswer}\n${input.explanation ? `Объяснение: ${input.explanation}` : ''}
Верни ТОЛЬКО JSON: {"correct":true|false,"feedback":"короткая доброжелательная обратная связь","hint":"подсказка без раскрытия ответа"}.`;
  const text = await providerText([{ role: 'system', content: 'Ты строгий, но доброжелательный учитель. Не придумывай правильность ответа.' }, { role: 'user', content: prompt }]);
  return parseJson(text) as { correct: boolean; feedback: string; hint: string };
}
