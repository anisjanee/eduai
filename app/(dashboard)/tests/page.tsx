'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui';

export default function Tests() {
  const [subject, setSubject] = useState('Математика');
  const [difficulty, setDifficulty] = useState('medium');
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [testId, setTestId] = useState('');

  async function createTest() {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/tests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject, difficulty, count }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Не удалось создать тест');
      setTestId(data.test.id);
    } catch (err) { setError(err instanceof Error ? err.message : 'Ошибка'); } finally { setLoading(false); }
  }

  return <div className="p-5 md:p-8 max-w-6xl mx-auto">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
      <div><h1 className="text-3xl font-black">Тесты</h1><p className="text-gray-500 mt-1">AI создаст тест под твой уровень и предмет.</p></div>
      <div className="flex flex-wrap gap-2">
        <select value={subject} onChange={(e) => setSubject(e.target.value)} className="border rounded-xl px-3 py-2"><option>Математика</option><option>Английский</option><option>Физика</option><option>Информатика</option><option>Химия</option><option>Биология</option></select>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="border rounded-xl px-3 py-2"><option value="easy">Легко</option><option value="medium">Средне</option><option value="hard">Сложно</option></select>
        <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="border rounded-xl px-3 py-2"><option value="5">5</option><option value="10">10</option><option value="15">15</option><option value="20">20</option></select>
        <button onClick={createTest} disabled={loading} className="px-4 py-2 rounded-xl bg-[#635bff] text-white font-bold disabled:opacity-50">{loading ? 'AI создаёт…' : 'Создать тест'}</button>
      </div>
    </div>
    {error && <div className="mt-5 p-4 rounded-xl bg-red-50 text-red-700">{error}</div>}
    {testId && <Card className="p-5 mt-5 bg-[#635bff]/5"><b>Тест готов!</b><p className="text-sm text-gray-500 mt-1">Вопросы сгенерированы и сохранены.</p><Link href={`/tests/${testId}`} className="inline-block mt-3 text-[#635bff] font-bold">Начать →</Link></Card>}
    <div className="grid md:grid-cols-3 gap-4 mt-7">
      {[['🧮','Математика','Алгебра и базовые темы'],['🇬🇧','Английский','Грамматика и лексика'],['⚛️','Физика','Формулы и задачи']].map(([icon,name,desc]) => <Card className="p-5" key={name}><span className="text-3xl">{icon}</span><h2 className="font-bold text-lg mt-3">{name}</h2><p className="text-sm text-gray-500 mt-1">{desc}</p><p className="text-xs text-gray-400 mt-4">Выбери параметры выше и создай персональный тест.</p></Card>)}
    </div>
  </div>;
}
