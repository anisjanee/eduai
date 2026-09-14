import Link from 'next/link'; import { redirect } from 'next/navigation'; import { Card, ProgressBar } from '@/components/ui'; import { createClient } from '@/lib/supabase/server';

export default async function Dashboard(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/login');
  const {data:profile}=await supabase.from('profiles').select('name,xp,streak,goal,grade').eq('id',user.id).maybeSingle();
  if(!profile) redirect('/onboarding');
  const {data:links}=await supabase.from('user_subjects').select('subject_id,progress').eq('user_id',user.id);
  const ids=(links||[]).map(x=>x.subject_id);
  const {data:subjects}=ids.length?await supabase.from('subjects').select('id,name,icon').in('id',ids):{data:[]};
  const progressMap=new Map((links||[]).map(x=>[x.subject_id,x.progress||0]));
  const shown=(subjects||[]).map(s=>({...s,progress:progressMap.get(s.id)||0}));
  const totalProgress=shown.length?Math.round(shown.reduce((a,s)=>a+s.progress,0)/shown.length):0;
  return <div className="p-5 md:p-8 max-w-7xl mx-auto"><div className="flex justify-between items-end"><div><p className="text-gray-500">Добро пожаловать, {profile.name} 👋</p><h1 className="text-3xl font-black mt-1">Продолжим учиться?</h1>{profile.goal&&<p className="text-sm text-gray-500 mt-2">Цель: {profile.goal}</p>}</div><div className="text-right"><b className="text-xl">🔥 {profile.streak||0} дней</b><p className="text-xs text-gray-500">серия</p></div></div><div className="grid md:grid-cols-3 gap-4 mt-7"><Card className="p-5"><p className="text-gray-500">Средний прогресс</p><b className="text-3xl">{totalProgress}%</b><ProgressBar value={totalProgress}/></Card><Card className="p-5"><p className="text-gray-500">Заработано XP</p><b className="text-3xl">{(profile.xp||0).toLocaleString('ru-RU')}</b><p className="text-sm text-gray-500 mt-2">твой текущий результат</p></Card><Card className="p-5"><p className="text-gray-500">Предметов</p><b className="text-3xl">{shown.length}</b><p className="text-sm text-gray-500 mt-2">выбрано в обучении</p></Card></div><div className="grid lg:grid-cols-3 gap-5 mt-6"><Card className="p-6 lg:col-span-2"><h2 className="text-xl font-bold">Сегодня</h2><div className="mt-4 space-y-3"><Link href="/tutor" className="block border rounded-xl p-4 hover:bg-gray-50"><b>AI-репетитор</b><p className="text-sm text-gray-500">Разбери тему, которая вызывает трудности</p></Link><Link href="/practice" className="block border rounded-xl p-4 hover:bg-gray-50"><b>Практика</b><p className="text-sm text-gray-500">Персональные задания по твоим предметам</p></Link></div></Card><Card className="p-6"><h2 className="text-xl font-bold">Мои предметы</h2>{shown.length?shown.slice(0,5).map(s=><div className="mt-5" key={s.id}><div className="flex justify-between text-sm"><span>{s.icon} {s.name}</span><span>{s.progress}%</span></div><ProgressBar value={s.progress}/></div>):<p className="text-sm text-gray-500 mt-4">Предметы пока не выбраны.</p>}</Card></div></div>
}
