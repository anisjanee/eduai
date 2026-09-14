'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui';

const SUBJECTS = [
  ['math', 'Математика', '∑'], ['english', 'Английский', 'A'], ['cs', 'Информатика', '</>'],
  ['physics', 'Физика', '⚛'], ['chemistry', 'Химия', '⚗'], ['biology', 'Биология', '🧬'],
  ['russian', 'Русский', 'АБ'], ['history', 'История', '⌛'],
];

export default function Onboarding() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [grade, setGrade] = useState('');
  const [goal, setGoal] = useState('');
  const [level, setLevel] = useState('beginner');
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace('/login'); return; }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
      if (profile) {
        setName(profile.name || data.user.user_metadata?.name || '');
        setAge(profile.age?.toString() || ''); setGrade(profile.grade || ''); setGoal(profile.goal || ''); setLevel(profile.level || 'beginner');
        const { data: links } = await supabase.from('user_subjects').select('subject_id').eq('user_id', data.user.id);
        setSelected((links || []).map((x) => x.subject_id));
      }
      setLoading(false);
    });
  }, [router]);

  function toggleSubject(id: string) { setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]); }

  async function submit(e: FormEvent) {
    e.preventDefault(); setError('');
    if (!selected.length) { setError('Выбери хотя бы один предмет'); return; }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/login'); return; }
    const { error: profileError } = await supabase.from('profiles').upsert({ id: user.id, name: name.trim() || 'Ученик', age: age ? Number(age) : null, grade, goal, level, locale: 'ru' });
    if (profileError) { setError('Не удалось сохранить профиль. Проверь настройки Supabase.'); setSaving(false); return; }
    await supabase.from('user_subjects').delete().eq('user_id', user.id);
    const { error: subjectsError } = await supabase.from('user_subjects').insert(selected.map((subject_id) => ({ user_id: user.id, subject_id })));
    if (subjectsError) { setError('Не удалось сохранить предметы.'); setSaving(false); return; }
    router.replace('/dashboard'); router.refresh();
  }

  if (loading) return <div className="min-h-screen grid place-items-center text-gray-500">Загружаем профиль…</div>;

  return <main className="min-h-screen bg-gray-50 p-5 md:p-10"><div className="max-w-3xl mx-auto">
    <div className="mb-8"><div className="text-2xl font-black"><span className="text-[#635bff]">Edu</span>AI</div><p className="text-gray-500 mt-2">Настроим репетитора под тебя за минуту.</p></div>
    <form onSubmit={submit} className="card bg-white p-6 md:p-8 space-y-7">
      <section><h1 className="text-2xl font-black">Расскажи о себе</h1><p className="text-gray-500 mt-1">Эти данные помогут подобрать уровень и задания.</p><div className="grid md:grid-cols-2 gap-4 mt-5">
        <input required value={name} onChange={e=>setName(e.target.value)} placeholder="Имя" className="border rounded-xl p-3"/>
        <input type="number" min="5" max="100" value={age} onChange={e=>setAge(e.target.value)} placeholder="Возраст" className="border rounded-xl p-3"/>
        <select value={grade} onChange={e=>setGrade(e.target.value)} className="border rounded-xl p-3"><option value="">Класс / курс</option>{['1 класс','2 класс','3 класс','4 класс','5 класс','6 класс','7 класс','8 класс','9 класс','10 класс','11 класс','Колледж / вуз'].map(x=><option key={x}>{x}</option>)}</select>
        <select value={level} onChange={e=>setLevel(e.target.value)} className="border rounded-xl p-3"><option value="beginner">Начальный уровень</option><option value="intermediate">Средний уровень</option><option value="advanced">Продвинутый уровень</option></select>
      </div></section>
      <section><h2 className="text-lg font-bold">Главная цель</h2><div className="grid sm:grid-cols-3 gap-3 mt-3">{['Подтянуть оценки','Подготовиться к экзамену','Разобраться в сложных темах'].map(x=><button type="button" key={x} onClick={()=>setGoal(x)} className={`p-4 rounded-xl border text-left ${goal===x?'border-[#635bff] bg-[#635bff]/10':''}`}>{x}</button>)}</div></section>
      <section><h2 className="text-lg font-bold">Какие предметы изучаем?</h2><div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">{SUBJECTS.map(([id,title,icon])=><button type="button" key={id} onClick={()=>toggleSubject(id)} className={`p-4 rounded-xl border text-left ${selected.includes(id)?'border-[#635bff] bg-[#635bff]/10':''}`}><span className="text-xl">{icon}</span><div className="font-semibold mt-2">{title}</div></button>)}</div></section>
      {error && <p className="text-sm text-red-600">{error}</p>}<Button disabled={saving} className="w-full">{saving?'Сохраняем…':'Готово — открыть мой кабинет'}</Button>
    </form>
  </div></main>;
}
