"use client";
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui';

export default function Login() {
  const search = useSearchParams();
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
  async function submit(e:FormEvent){e.preventDefault();setLoading(true);setError('');const {error}=await createClient().auth.signInWithPassword({email,password});if(error)setError(error.message);else location.href=search.get('next')||'/dashboard';setLoading(false);}
  return <div className="min-h-screen grid place-items-center p-5"><div className="w-full max-w-md"><Link href="/" className="text-2xl font-black"><span className="text-[#635bff]">Edu</span>AI</Link><div className="card p-7 mt-6"><h1 className="text-2xl font-bold">С возвращением 👋</h1><form className="space-y-4 mt-6" onSubmit={submit}><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full border rounded-xl p-3"/><input required type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Пароль" className="w-full border rounded-xl p-3"/><Link href="/forgot-password" className="block text-right text-sm text-[#635bff]">Забыли пароль?</Link>{error&&<p className="text-sm text-red-600">{error}</p>}<Button disabled={loading} className="w-full">{loading?'Входим…':'Войти'}</Button></form><p className="text-center mt-5 text-sm">Нет аккаунта? <Link href="/register" className="text-[#635bff]">Создать</Link></p></div></div></div>
}
