'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui';

type PlanItem = { day: string; subject: string; topic: string; minutes: number; task: string };
type Plan = { id: string; title: string; items: PlanItem[]; created_at: string };

export default function Plan() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  async function loadPlan() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/plan', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ошибка загрузки');
      setPlan(data.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить план');
    } finally {
      setLoading(false);
    }
  }

  async function generatePlan() {
    setGenerating(true);
    setError('');
    try {
      const response = await fetch('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ regenerate: true }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Не удалось создать план');
      setPlan(data.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать план');
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => { void loadPlan(); }, []);

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Учебный план</h1>
          <p className="text-gray-500 mt-1">Персональный план на неделю, который учитывает твой прогресс.</p>
        </div>
        <button onClick={generatePlan} disabled={generating} className="px-5 py-3 rounded-xl bg-[#635bff] text-white font-bold disabled:opacity-60">
          {generating ? 'AI составляет…' : plan ? 'Обновить план' : 'Создать план'}
        </button>
      </div>

      {error && <div className="mt-5 p-4 rounded-xl bg-red-50 text-red-700">{error}</div>}

      {loading ? (
        <Card className="p-8 mt-7 text-gray-500">Загружаю твой план…</Card>
      ) : !plan ? (
        <Card className="p-8 mt-7 text-center">
          <div className="text-5xl">🧠</div>
          <h2 className="font-bold text-xl mt-4">Пока нет учебного плана</h2>
          <p className="text-gray-500 mt-2">EduAI проанализирует твои предметы и прогресс и составит план на неделю.</p>
          <button onClick={generatePlan} disabled={generating} className="mt-5 px-5 py-3 rounded-xl bg-[#635bff] text-white font-bold disabled:opacity-60">{generating ? 'Создаю…' : 'Создать первый план'}</button>
        </Card>
      ) : (
        <>
          <Card className="p-5 mt-7 bg-[#635bff]/5 border-[#635bff]/10">
            <p className="text-sm text-gray-500">Последний план</p>
            <h2 className="font-bold text-xl mt-1">{plan.title}</h2>
            <p className="text-sm text-gray-500 mt-1">{plan.items.reduce((sum, item) => sum + item.minutes, 0)} минут · {plan.items.length} учебных дней</p>
          </Card>

          <div className="space-y-3 mt-5">
            {plan.items.map((item, index) => (
              <Card className="p-5 flex flex-col sm:flex-row sm:items-center gap-4" key={`${item.day}-${index}`}>
                <div className="w-12 h-12 shrink-0 rounded-xl bg-[#635bff]/10 text-[#635bff] grid place-items-center font-bold">{item.day}</div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <b>{item.subject}</b>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">{item.topic}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{item.task}</p>
                </div>
                <span className="text-sm font-medium text-gray-500">{item.minutes} мин</span>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
