"use client";

import { useState } from 'react';
import { Card, Button } from '@/components/ui';

type Question = { id: string; prompt: string; type: 'short' | 'multiple_choice'; options?: string[]; difficulty: string; subject_id: string };
type Result = { correct: boolean; feedback: string; hint?: string };

export default function Practice() {
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [count, setCount] = useState(0);

  async function generate() {
    setLoading(true); setError(''); setResult(null); setAnswer('');
    try {
      const r = await fetch('/api/ai/question', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: 'Математика', topic: topic || undefined, difficulty }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Не удалось создать задачу');
      setQuestion(d.question); setCount((v) => v + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка AI'); }
    finally { setLoading(false); }
  }

  async function check() {
    if (!question || !answer.trim() || checking) return;
    setChecking(true); setError('');
    try {
      const r = await fetch('/api/ai/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId: question.id, question: question.prompt, correctAnswer: 'Смотри сохранённый ответ задачи', studentAnswer: answer }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Не удалось проверить ответ');
      setResult(d);
    } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка проверки'); }
    finally { setChecking(false); }
  }

  return <div className="p-5 md:p-8 max-w-4xl mx-auto">
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"><div><h1 className="text-3xl font-black">Практика</h1><p className="text-gray-500 mt-1">AI генерирует задачи под твой уровень и проверяет ответы.</p></div><span className="text-sm text-gray-500">Задач создано: <b>{count}</b></span></div>
    <Card className="p-5 mt-6"><div className="grid md:grid-cols-[1fr_auto_auto] gap-3"><input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Тема, например: квадратные уравнения" className="border rounded-xl p-3" /><select value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)} className="border rounded-xl p-3"><option value="easy">Легко</option><option value="medium">Средне</option><option value="hard">Сложно</option></select><Button onClick={generate} disabled={loading}>{loading ? 'Генерирую…' : 'Новая задача'}</Button></div></Card>
    {error && <div className="mt-4 p-4 rounded-xl bg-red-50 text-red-700">{error}</div>}
    {question ? <Card className="p-7 mt-5"><div className="flex justify-between text-sm text-gray-500"><span>Математика</span><span>{question.difficulty}</span></div><h2 className="text-2xl font-bold mt-7 whitespace-pre-wrap">{question.prompt}</h2>{question.type === 'multiple_choice' && question.options?.length ? <div className="grid gap-3 mt-7">{question.options.map((option) => <button key={option} onClick={() => setAnswer(option)} className={`text-left border rounded-xl p-4 hover:border-[#635bff] ${answer === option ? 'border-[#635bff] bg-[#635bff]/5' : ''}`}>{option}</button>)}</div> : <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Напиши свой ответ и ход решения…" className="w-full border rounded-xl p-3 mt-7 min-h-28" />}<div className="flex gap-3 mt-4"><Button onClick={check} disabled={!answer.trim() || checking}>{checking ? 'Проверяю…' : 'Проверить ответ'}</Button><Button onClick={generate} disabled={loading}>Следующая</Button></div>{result && <div className={`mt-6 p-5 rounded-2xl ${result.correct ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-900'}`}><b>{result.correct ? 'Верно! 🎉' : 'Пока не совсем'}</b><p className="mt-2">{result.feedback}</p>{!result.correct && result.hint && <p className="mt-2"><b>Подсказка:</b> {result.hint}</p>}</div>}</Card> : <Card className="p-10 mt-5 text-center"><div className="text-5xl">🧠</div><h2 className="text-xl font-bold mt-4">Готов начать?</h2><p className="text-gray-500 mt-2">Выбери сложность и нажми «Новая задача».</p></Card>}
  </div>;
}
