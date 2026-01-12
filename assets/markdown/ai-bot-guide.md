# Создание AI-бота с нуля

**Дата публикации:** 10 января 2026 года  
**Автор:** GorTEx  
**Категория:** Telegram боты

## Введение

Создание Telegram бота с искусственным интеллектом - это мощный инструмент для автоматизации, поддержки клиентов и создания уникальных пользовательских интерфейсов. В этом руководстве мы создадим полнофункционального AI-бота с нуля.

## Архитектура проекта
ai-telegram-bot/

├── src/
\
│ ├── bot/
\
│ │ ├── handlers/
\
│ │ ├── keyboards/
\
│ │ └── middlewares/
\
│ ├── ai/
\
│ │ ├── models/
\
│ │ └── services/
\
│ ├── database/
\
│ │ ├── models/
\
│ │ └── migrations/
\
│ └── utils/
\
├── .env
\
├── requirements.txt
\
└── docker-compose.yml

## Шаг 1: Настройка окружения

### Установка зависимостей

```python
# requirements.txt
aiogram==3.0
openai==1.0
langchain==0.1
chromadb==0.4
postgresql-client==14
redis==4.5
python-dotenv==1.0
sqlalchemy==2.0
Настройка переменных окружения
bash
# .env
BOT_TOKEN=ваш_токен_бота
OPENAI_API_KEY=ваш_ключ_openai
DATABASE_URL=postgresql://user:pass@localhost:5432/ai_bot
REDIS_URL=redis://localhost:6379/0
ADMIN_IDS=123456789,987654321
WEBHOOK_URL=https://ваш-домен.ру/webhook

Шаг 2: Создание базовой структуры бота

Главный файл бота
python
# src/main.py
import asyncio
import logging
from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.redis import RedisStorage
from dotenv import load_dotenv
import os

from src.bot.handlers import register_handlers
from src.database import init_db

load_dotenv()

async def main():
    logging.basicConfig(level=logging.INFO)
    
    # Инициализация базы данных
    await init_db()
    
    # Инициализация бота
    bot = Bot(token=os.getenv("BOT_TOKEN"))
    storage = RedisStorage.from_url(os.getenv("REDIS_URL"))
    dp = Dispatcher(storage=storage)
    
    # Регистрация handlers
    register_handlers(dp)
    
    # Запуск бота
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
    
Шаг 3: Интеграция AI моделей

Сервис для работы с OpenAI
python
# src/ai/services/openai_service.py
import openai
from typing import List, Dict, Optional
from dataclasses import dataclass
import os

@dataclass
class AIResponse:
    text: str
    tokens_used: int
    model: str

class OpenAIService:
    def __init__(self):
        self.client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.models = {
            "fast": "gpt-4-mini",
            "balanced": "gpt-4-turbo",
            "powerful": "gpt-4o"
        }
    
    async def generate_response(
        self, 
        prompt: str, 
        context: Optional[List[Dict]] = None,
        model_type: str = "balanced"
    ) -> AIResponse:
        
        messages = []
        
        # Добавляем системный промпт
        messages.append({
            "role": "system",
            "content": """Ты полезный AI-ассистент в Telegram боте. 
            Отвечай кратко, информативно и дружелюбно.
            Если не знаешь ответа - так и скажи."""
        })
        
        # Добавляем контекст разговора
        if context:
            messages.extend(context)
        
        # Добавляем текущий запрос пользователя
        messages.append({"role": "user", "content": prompt})
        
        # Генерируем ответ
        response = await self.client.chat.completions.create(
            model=self.models[model_type],
            messages=messages,
            temperature=0.7,
            max_tokens=1000
        )
        
        return AIResponse(
            text=response.choices[0].message.content,
            tokens_used=response.usage.total_tokens,
            model=self.models[model_type]
        )
    
    async def generate_image(self, prompt: str) -> str:
        response = await self.client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1
        )
        
        return response.data[0].url
        
Шаг 4: Создание обработчиков сообщений

Основной handler для AI-чата
python
# src/bot/handlers/chat.py
from aiogram import Router, F
from aiogram.types import Message
from aiogram.fsm.context import FSMContext
from aiogram.filters import Command

from src.ai.services.openai_service import OpenAIService
from src.database.models import Conversation
from src.utils.rate_limit import rate_limit

router = Router()
ai_service = OpenAIService()

@router.message(Command("start"))
async def cmd_start(message: Message):
    await message.answer(
        "👋 Привет! Я AI-ассистент GDEV.PRO\n"
        "Я могу:\n"
        "• Отвечать на вопросы\n"
        "• Генерировать текст\n"
        "• Создавать изображения\n"
        "• Помогать с кодом\n\n"
        "Просто напиши мне что-нибудь!"
    )

@router.message(F.text & ~F.command)
@rate_limit(limit=5, window=60)
async def handle_message(message: Message, state: FSMContext):
    user_id = message.from_user.id
    
    # Получаем контекст разговора из базы
    context = await Conversation.get_context(user_id, limit=10)
    
    # Генерируем ответ через AI
    ai_response = await ai_service.generate_response(
        prompt=message.text,
        context=context
    )
    
    # Сохраняем сообщение в базу
    await Conversation.create(
        user_id=user_id,
        message=message.text,
        response=ai_response.text,
        tokens_used=ai_response.tokens_used
    )
    
    # Отправляем ответ пользователю
    await message.answer(ai_response.text)

@router.message(Command("image"))
async def cmd_image(message: Message, state: FSMContext):
    await state.set_state("waiting_for_prompt")
    await message.answer("🎨 Опиши, какую картинку создать:")

@router.message(F.text, state="waiting_for_prompt")
async def process_image_prompt(message: Message, state: FSMContext):
    await message.answer("🖼️ Создаю изображение...")
    
    try:
        image_url = await ai_service.generate_image(message.text)
        await message.answer_photo(image_url, caption="Вот твое изображение!")
    except Exception as e:
        await message.answer(f"❌ Ошибка: {str(e)}")
    
    await state.clear()
    
Шаг 5: База данных и контекст

Модель разговора
python
# src/database/models/conversation.py
from sqlalchemy import Column, Integer, String, Text, DateTime, BigInteger
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import json

Base = declarative_base()

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(BigInteger, index=True)
    role = Column(String(10))  # user или assistant
    message = Column(Text)
    response = Column(Text, nullable=True)
    tokens_used = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    @classmethod
    async def get_context(cls, user_id: int, limit: int = 10):
        # Получаем последние сообщения пользователя
        from src.database import async_session
        
        async with async_session() as session:
            result = await session.execute(
                select(cls)
                .where(cls.user_id == user_id)
                .order_by(cls.created_at.desc())
                .limit(limit)
            )
            
            conversations = result.scalars().all()
            
            # Форматируем в формат для OpenAI
            context = []
            for conv in reversed(conversations):  # В хронологическом порядке
                if conv.role == "user":
                    context.append({"role": "user", "content": conv.message})
                elif conv.role == "assistant" and conv.response:
                    context.append({"role": "assistant", "content": conv.response})
            
            return context
            
Шаг 6: Система оплаты и лимитов

Модель пользователя с балансом
python
# src/database/models/user.py
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    telegram_id = Column(BigInteger, unique=True, index=True)
    username = Column(String(100), nullable=True)
    balance = Column(Integer, default=0)  # Баланс в копейках
    subscription_tier = Column(String(20), default="free")
    tokens_used = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Лимиты для разных тарифов
    TIER_LIMITS = {
        "free": {"daily_tokens": 1000, "image_gen": 0},
        "basic": {"daily_tokens": 10000, "image_gen": 10},
        "pro": {"daily_tokens": 100000, "image_gen": 100},
        "unlimited": {"daily_tokens": -1, "image_gen": -1}
    }
    
    def can_use_tokens(self, tokens: int) -> bool:
        if self.subscription_tier == "unlimited":
            return True
        
        limit = self.TIER_LIMITS[self.subscription_tier]["daily_tokens"]
        if limit == -1:
            return True
        
        return (self.tokens_used + tokens) <= limit
Интеграция с платежной системой
python
# src/utils/payment.py
import hashlib
from yookassa import Configuration, Payment

class PaymentService:
    def __init__(self):
        Configuration.account_id = os.getenv("YOOKASSA_ACCOUNT_ID")
        Configuration.secret_key = os.getenv("YOOKASSA_SECRET_KEY")
    
    async def create_payment(
        self, 
        user_id: int, 
        amount: float, 
        description: str
    ) -> str:
        payment = Payment.create({
            "amount": {
                "value": str(amount),
                "currency": "RUB"
            },
            "confirmation": {
                "type": "redirect",
                "return_url": f"https://t.me/ваш_бот?start=payment_success"
            },
            "capture": True,
            "description": description,
            "metadata": {
                "user_id": user_id
            }
        })
        
        # Сохраняем платеж в базу
        await PaymentRecord.create(
            user_id=user_id,
            payment_id=payment.id,
            amount=amount,
            status="pending"
        )
        
        return payment.confirmation.confirmation_url
        
Шаг 7: Деплой и масштабирование

Docker-конфигурация
yaml
# docker-compose.yml
version: '3.8'

services:
  bot:
    build: .
    restart: always
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/ai_bot
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis
    volumes:
      - ./logs:/app/logs

  db:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_DB: ai_bot
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl

volumes:
  postgres_data:
  redis_data:
Nginx конфигурация для webhook
nginx
# nginx.conf
server {
    listen 443 ssl;
    server_name ваш-домен.ру;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    location /webhook {
        proxy_pass http://bot:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

Шаг 8: Мониторинг и аналитика

Панель администратора
python
# src/admin/views.py
from aiogram import Router, types
from aiogram.filters import Command
from src.database.models import User, Conversation
import matplotlib.pyplot as plt
import io

router = Router()

@router.message(Command("stats"))
async def cmd_stats(message: Message):
    user_id = message.from_user.id
    
    # Проверяем права администратора
    if str(user_id) not in os.getenv("ADMIN_IDS").split(","):
        return
    
    # Получаем статистику
    total_users = await User.count()
    active_today = await User.filter(
        last_activity__gte=datetime.utcnow() - timedelta(days=1)
    ).count()
    
    total_tokens = await Conversation.sum("tokens_used")
    revenue_today = await PaymentRecord.filter(
        created_at__gte=datetime.utcnow() - timedelta(days=1),
        status="succeeded"
    ).sum("amount")
    
    stats_text = f"""
📊 *Статистика бота:*
👥 Всего пользователей: {total_users}
🔥 Активных сегодня: {active_today}
💬 Использовано токенов: {total_tokens:,}
💰 Выручка за день: {revenue_today} руб.
    """
    
    await message.answer(stats_text, parse_mode="Markdown")
Заключение
Вы создали полнофункционального AI-бота с:

Интеграцией OpenAI GPT-4

Контекстными разговорами

Генерацией изображений

Системой оплаты и лимитов

Админ-панелью

Масштабируемой архитектурой

Следующие шаги
Добавьте больше AI моделей (Claude, Gemini, локальные модели)

Интегрируйте RAG (Retrieval-Augmented Generation) для работы с вашими документами

Добавьте голосовые сообщения

Создайте веб-панель для управления

Настройте A/B тестирование разных AI моделей

Нужен профессиональный AI-бот? Обращайтесь в GDEV.PRO - мы создадим бота под ваши задачи!