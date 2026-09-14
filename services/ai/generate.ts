import { TUTOR_SYSTEM_PROMPT, type TutorMessage } from './index';

export type GeneratedQuestion = {
  subject: string; topic: string; difficulty: 'easy' | 'medium' | 'hard'; type: 'short' | 'multiple_choice'; prompt: string; options?: string[]; correct_answer: string; explanation: string;
};
export type StudyPlanItem = { day: string; subject: string; topic: string; minutes: number; task: string };
export type GeneratedTest = { title: string; subject: string; topic: string; questions: Array<{ prompt: string; type: 'short' | 'multiple_choice'; options: string[]; correct_answer: string; explanation: string; difficulty: string }> };

async function providerText(messages: TutorMessage[]) {
  const provider = process.env.AI_PROVIDER === 'openai' && process.env.OPENAI_API_KEY ? 'openai' : 'ollama';
  if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, cache: 'no-store', body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages, temperature: 0.3, max_tokens: 3000 }) });
    if (!response.ok) throw new Error(`AI_PROVIDER_ERROR:${response.status}`);
    const data = await response.json(); return data.choices?.[0]?.message?.content || '';
  }
  const baseUrl = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', body: JSON.stringify({ model: process.env.OLLAMA_MODEL || 'qwen2.5:7b', stream: false, messages, options: { temperature: 0.3 } }) });
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
  const prompt = `Создай одну учебную задачу для ученика. Предмет: ${input.subject}. Тема: ${input.topic || 'выбери подходящую базовую тему'}. Сложность: ${input.difficulty || 'medium'}.\nВерни ТОЛЬКО JSON без markdown по схеме: {"subject":"...","topic":"...","difficulty":"easy|medium|hard","type":"short|multiple_choice","prompt":"...","options":["..."],"correct_answer":"...","explanation":"..."}. Для short options должен быть [].`;
  const text = await providerText([{ role: 'system', content: TUTOR_SYSTEM_PROMPT }, { role: 'user', content: prompt }]);
  const q = parseJson(text); if (!q.prompt || !q.correct_answer || !q.explanation) throw new Error('AI_INVALID_QUESTION'); return q as GeneratedQuestion;
}

export async function checkAnswer(input: { question: string; correctAnswer: string; studentAnswer: string; explanation?: string }) {
  const prompt = `Проверь ответ ученика. Задача: ${input.question}\nПравильный ответ: ${input.correctAnswer}\nОтвет ученика: ${input.studentAnswer}\n${input.explanation ? `Объяснение: ${input.explanation}` : ''}\nВерни ТОЛЬКО JSON: {"correct":true|false,"feedback":"короткая доброжелательная обратная связь","hint":"подсказка без раскрытия ответа"}.`;
  const text = await providerText([{ role: 'system', content: 'Ты строгий, но доброжелательный учитель. Не придумывай правильность ответа.' }, { role: 'user', content: prompt }]);
  return parseJson(text) as { correct: boolean; feedback: string; hint: string };
}

export async function generateStudyPlan(input: { subjects: string[]; goal?: string; grade?: string; weakTopics?: string[] }): Promise<StudyPlanItem[]> {
  const subjects = input.subjects.length ? input.subjects : ['Математика'];
  const prompt = `Составь реалистичный персональный учебный план на 7 дней для ученика EduAI.\nПредметы: ${subjects.join(', ')}.\nЦель: ${input.goal || 'улучшить знания и закрепить материал'}.\nКласс: ${input.grade || 'не указан'}.\nСлабые темы: ${input.weakTopics?.length ? input.weakTopics.join(', ') : 'не определены'}.\nПлан должен содержать 5 учебных дней, по одной задаче на день, 20–40 минут. Чередуй предметы и уделяй больше внимания слабым темам.\nВерни ТОЛЬКО JSON: {"items":[{"day":"Пн","subject":"...","topic":"...","minutes":25,"task":"..."}]}.\nДни строго: Пн, Вт, Ср, Чт, Пт.`;
  const text = await providerText([{ role: 'system', content: TUTOR_SYSTEM_PROMPT }, { role: 'user', content: prompt }]);
  const parsed = parseJson(text); if (!Array.isArray(parsed.items) || parsed.items.length < 5) throw new Error('AI_INVALID_PLAN');
  return parsed.items.slice(0, 5).map((item: StudyPlanItem) => ({ day: String(item.day), subject: String(item.subject), topic: String(item.topic), minutes: Math.min(60, Math.max(10, Number(item.minutes) || 25)), task: String(item.task) }));
}

export async function generateTest(input: { subject: string; topic?: string; difficulty?: string; count?: number }): Promise<GeneratedTest> {
  const count = Math.min(20, Math.max(5, input.count ?? 10));
  const prompt = `Создай тест EduAI из ${count} вопросов. Предмет: ${input.subject}. Тема: ${input.topic || 'базовые темы'}. Сложность: ${input.difficulty || 'medium'}.\nСделай вопросы однозначными, без неоднозначных формулировок. Используй short и multiple_choice. Для multiple_choice дай 4 варианта.\nВерни ТОЛЬКО JSON: {"title":"...","subject":"...","topic":"...","questions":[{"prompt":"...","type":"short|multiple_choice","options":[],"correct_answer":"...","explanation":"...","difficulty":"easy|medium|hard"}]}.`;
  const text = await providerText([{ role: 'system', content: TUTOR_SYSTEM_PROMPT }, { role: 'user', content: prompt }]);
  const parsed = parseJson(text);
  if (!Array.isArray(parsed.questions) || parsed.questions.length < count) throw new Error('AI_INVALID_TEST');
  return { title: String(parsed.title || `Тест: ${input.subject}`), subject: String(parsed.subject || input.subject), topic: String(parsed.topic || input.topic || ''), questions: parsed.questions.slice(0, count).map((q: GeneratedTest['questions'][number]) => ({ prompt: String(q.prompt), type: q.type === 'multiple_choice' ? 'multiple_choice' : 'short', options: Array.isArray(q.options) ? q.options.map(String).slice(0, 4) : [], correct_answer: String(q.correct_answer), explanation: String(q.explanation), difficulty: String(q.difficulty || input.difficulty || 'medium') })) };
}
