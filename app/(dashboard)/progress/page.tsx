import { Card, ProgressBar } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';

function dayKey(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(new Date(`${value}T12:00:00`));
}

export default async function Progress() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const [answersResult, questionsResult, sessionsResult, subjectsResult, userSubjectsResult, topicsResult] = await Promise.all([
    supabase.from('answers').select('question_id,correct').eq('user_id', user.id),
    supabase.from('questions').select('id,subject_id,topic_id').eq('user_id', user.id),
    supabase.from('study_sessions').select('subject_id,minutes,xp,created_at').eq('user_id', user.id),
    supabase.from('subjects').select('id,name,icon'),
    supabase.from('user_subjects').select('subject_id,progress').eq('user_id', user.id),
    supabase.from('topics').select('id,name,subject_id'),
  ]);

  const answers = answersResult.data ?? [];
  const questions = questionsResult.data ?? [];
  const sessions = sessionsResult.data ?? [];
  const subjects = subjectsResult.data ?? [];
  const userSubjects = userSubjectsResult.data ?? [];
  const topics = topicsResult.data ?? [];

  const totalAnswered = answers.length;
  const correctCount = answers.filter((answer) => answer.correct).length;
  const accuracy = totalAnswered ? Math.round((correctCount / totalAnswered) * 100) : 0;
  const studyDays = new Set(sessions.map((session) => dayKey(session.created_at))).size;
  const weeklySessions = sessions.filter((session) => new Date(session.created_at) >= since);
  const weeklyXp = weeklySessions.reduce((sum, session) => sum + (session.xp ?? 0), 0);
  const totalMinutes = sessions.reduce((sum, session) => sum + (session.minutes ?? 0), 0);

  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject]));
  const progressMap = new Map(userSubjects.map((item) => [item.subject_id, item.progress ?? 0]));

  const weekly = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(since);
    date.setDate(since.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: formatDay(key),
      xp: weeklySessions.filter((session) => dayKey(session.created_at) === key).reduce((sum, session) => sum + (session.xp ?? 0), 0),
    };
  });
  const maxXp = Math.max(20, ...weekly.map((day) => day.xp));

  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const topicStats = new Map<string, { total: number; correct: number; subjectId: string }>();
  for (const answer of answers) {
    const question = questionMap.get(answer.question_id);
    if (!question?.topic_id) continue;
    const current = topicStats.get(question.topic_id) ?? { total: 0, correct: 0, subjectId: question.subject_id };
    current.total += 1;
    if (answer.correct) current.correct += 1;
    topicStats.set(question.topic_id, current);
  }

  const weakTopics = [...topicStats.entries()]
    .map(([topicId, stat]) => ({
      topic: topics.find((item) => item.id === topicId),
      accuracy: Math.round((stat.correct / stat.total) * 100),
      total: stat.total,
      subject: subjectMap.get(stat.subjectId),
    }))
    .filter((item) => item.topic && item.total >= 1)
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total)
    .slice(0, 4);

  const recommendations = weakTopics.slice(0, 3).map((item) => {
    if (item.accuracy < 50) return `Повтори тему «${item.topic!.name}» и реши 3 простых задания.`;
    if (item.accuracy < 75) return `Закрепи тему «${item.topic!.name}» ещё 2–3 заданиями.`;
    return `Подтяни тему «${item.topic!.name}» до уверенного уровня.`;
  });

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-black">Прогресс</h1>
        <p className="text-gray-500 mt-1">Реальная статистика твоего обучения.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-7">
        <Card className="p-6"><p className="text-gray-500">Точность</p><b className="text-4xl">{accuracy}%</b><p className="text-sm text-gray-400 mt-2">{correctCount} правильных</p></Card>
        <Card className="p-6"><p className="text-gray-500">Решено задач</p><b className="text-4xl">{totalAnswered}</b><p className="text-sm text-gray-400 mt-2">за всё время</p></Card>
        <Card className="p-6"><p className="text-gray-500">Учебных дней</p><b className="text-4xl">{studyDays}</b><p className="text-sm text-gray-400 mt-2">в истории обучения</p></Card>
        <Card className="p-6"><p className="text-gray-500">XP за 7 дней</p><b className="text-4xl">{weeklyXp}</b><p className="text-sm text-gray-400 mt-2">{totalMinutes} мин. всего</p></Card>
      </div>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6 mt-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div><h2 className="font-bold text-xl">Активность за неделю</h2><p className="text-sm text-gray-500 mt-1">XP, полученный за учебные сессии.</p></div>
            <span className="font-bold">+{weeklyXp} XP</span>
          </div>
          <div className="h-48 mt-6 flex items-end gap-2 md:gap-4">
            {weekly.map((day) => (
              <div key={day.key} className="flex-1 h-full flex flex-col items-center justify-end gap-2">
                <span className="text-xs text-gray-500">{day.xp}</span>
                <div className="w-full max-w-10 rounded-t-xl bg-[#635bff]/80" style={{ height: `${Math.max(8, (day.xp / maxXp) * 100)}%` }} />
                <span className="text-xs text-gray-400 capitalize">{day.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-bold text-xl">Слабые темы</h2>
          <p className="text-sm text-gray-500 mt-1">Темы, где чаще всего возникают ошибки.</p>
          {weakTopics.length === 0 ? (
            <div className="mt-8 text-center text-gray-500">Пока недостаточно данных. Реши несколько заданий — здесь появится анализ.</div>
          ) : (
            <div className="space-y-5 mt-6">
              {weakTopics.map((item) => (
                <div key={item.topic!.id}>
                  <div className="flex justify-between gap-3 text-sm mb-2"><span className="font-medium">{item.topic!.name}</span><span className="text-gray-500">{item.accuracy}%</span></div>
                  <ProgressBar value={item.accuracy} />
                  <p className="text-xs text-gray-400 mt-1">{item.subject?.name ?? 'Предмет'} · {item.total} ответов</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6 mt-6">
        <h2 className="font-bold text-xl">Освоение предметов</h2>
        <p className="text-sm text-gray-500 mt-1">Прогресс сохраняется автоматически после практики.</p>
        {userSubjects.length === 0 ? (
          <div className="mt-6 text-gray-500">Выбери предмет и начни практику — прогресс появится здесь.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-x-8">
            {userSubjects.map((item) => {
              const subject = subjectMap.get(item.subject_id);
              const value = progressMap.get(item.subject_id) ?? 0;
              return (
                <div className="mt-6" key={item.subject_id}>
                  <div className="flex justify-between mb-2"><span className="font-medium">{subject?.icon} {subject?.name ?? item.subject_id}</span><span>{value}%</span></div>
                  <ProgressBar value={value} />
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-6 mt-6">
        <h2 className="font-bold text-xl">Рекомендации AI-репетитора</h2>
        {recommendations.length === 0 ? (
          <p className="text-gray-500 mt-3">Продолжай практику — после накопления статистики EduAI подберёт персональные рекомендации.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {recommendations.map((recommendation) => <li key={recommendation} className="p-4 rounded-xl bg-[#635bff]/5">{recommendation}</li>)}
          </ul>
        )}
      </Card>
    </div>
  );
}
