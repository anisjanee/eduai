'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, Button } from '@/components/ui';

type Question = { id: string; prompt: string; type: 'short' | 'multiple_choice'; options?: string[]; difficulty: string };
type Test = { id: string; title: string; question_count: number };

type Result = { score: number; correct_count: number; time_seconds: number };

export default function Test({ params }: { params: Promise<{ id: string }> }) {
  const [testId, setTestId] = useState('');
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [startedAt, setStartedAt] = useState(Date.now());

  useEffect(() => { void params.then(({ id }) => { setTestId(id); setStartedAt(Date.now()); fetch(`/api/tests/${id}`).then(async (r) => { const data = await r.json(); if (!r.ok) throw new Error(data.error); setTest(data.test); setQuestions(data.questions); }).catch((e) => setError(e.message || 'Не удалось загрузить тест')).finally(() => setLoading(false)); }); }, [params]);

  function setAnswer(value: string) { if (!questions[current]) return; setAnswers((prev) => ({ ...prev, [questions[current].id]: value })); }

  async function finish() {
    if (!testId || submitting) return;
    setSubmitting(true); setError('');
    try {
      const response = await fetch(`/api/tests/${testId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: questions.map((q) => ({ questionId: q.id, answer: answers[q.id] || '' })), timeSeconds: Math.round((Date.now() - startedAt) / 1000) }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Не удалось проверить тест');
      setResult(data.result);
    } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка'); } finally { setSubmitting(false); }
  }

  if (loading) return <div className="p-5 md:p-8 max-w-3xl mx-auto"><Card className="p-8">Загружаю тест…</Card></div>;
  if (error && !questions.length) return <div className="p-5 md:p-8 max-w-3xl mx-auto"><Card className="p-8 text-red-600">{error}</Card></div>;
  if (result) return <div className="p-5 md:p-8 max-w-3xl mx-auto"><Link href="/tests" className="text-[#635bff] text-sm">← Все тесты</Link><Card className="p-8 mt-4 text-center"><div className="text-6xl font-black">{result.score}%</div><h1 className="text-2xl font-black mt-3">{result.score >= 80 ? 'Отличный результат! 🎉' : result.score >= 60 ? 'Хорошая работа! 💪' : 'Есть что улучшить 📚'}</h1><p className="text-gray-500 mt-2">Правильных ответов: {result.correct_count} из {questions.length}</p><p className="text-sm text-gray-400 mt-1">Время: {Math.floor(result.time_seconds / 60)} мин {result.time_seconds % 60} сек</p><Link href="/tests" className="inline-block mt-6 px-5 py-3 rounded-xl bg-[#635bff] text-white font-bold">К тестам</Link></Card></div>;

  const q = questions[current];
  const answered = Object.keys(answers).filter((id) => answers[id]?.trim()).length;
  return <div className="p-5 md:p-8 max-w-3xl mx-auto"><Link href="/tests" className="text-[#635bff] text-sm">← Все тесты</Link><Card className="p-7 mt-4"><div className="flex justify-between text-sm text-gray-500"><span>{test?.title}</span><span>{current + 1} / {questions.length}</span></div><div className="h-2 bg-gray-100 rounded-full mt-4"><div className="h-full bg-[#635bff] rounded-full" style={{ width: `${((current + 1) / questions.length) * 100}%` }} /></div><h1 className="text-2xl font-black mt-7">{q.prompt}</h1>
    {q.type === 'multiple_choice' && q.options?.length ? <div className="space-y-3 mt-6">{q.options.map((option) => <button key={option} onClick={() => setAnswer(option)} className={`w-full text-left p-4 rounded-xl border ${answers[q.id] === option ? 'border-[#635bff] bg-[#635bff]/5' : 'border-gray-200'}`}>{option}</button>)}</div> : <input value={answers[q.id] || ''} onChange={(e) => setAnswer(e.target.value)} placeholder="Твой ответ" className="border rounded-xl p-3 w-full mt-6" />}
    {error && <p className="mt-4 text-red-600">{error}</p>}
    <div className="flex justify-between gap-3 mt-7"><Button disabled={current === 0} onClick={() => setCurrent((v) => v - 1)} className="bg-gray-100 !text-gray-700">Назад</Button>{current < questions.length - 1 ? <Button onClick={() => setCurrent((v) => v + 1)}>Далее</Button> : <Button disabled={submitting || answered === 0} onClick={finish}>{submitting ? 'Проверяю…' : 'Завершить тест'}</Button>}</div>
  </Card></div>;
}
