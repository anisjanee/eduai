# EduAI без API key

EduAI поддерживает локальный AI через Ollama. OpenAI API key для этого режима не нужен.

## Быстрый запуск

1. Установите Docker Desktop.
2. В корне проекта выполните:

```bash
docker compose up -d
```

3. Проверьте, что модель загрузилась:

```bash
docker compose logs -f ollama-model-init
```

4. В `.env.local` у приложения укажите:

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
```

Если Next.js тоже запущен внутри Docker, используйте `OLLAMA_BASE_URL=http://ollama:11434`.

## Что важно

- API key не требуется.
- Модель работает на вашем компьютере/сервере.
- Первый запуск скачивает модель и может занять время.
- Производительность зависит от CPU/RAM/GPU.
- Для публичного production-приложения Ollama лучше размещать на отдельном сервере, а не на устройстве каждого ученика.

## Альтернатива

Если позже понадобится более мощная облачная модель, можно переключить:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
```

Код приложения при этом менять не нужно.
