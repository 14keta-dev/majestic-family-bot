# Majestic Family Bot

Дискорд-бот для подачи заявок в семью на Majestic RP — формы заявок, воркфлоу рассмотрения и автоматическая выдача ролей.

## Getting Started

Следуя этим инструкциям, вы сможете развернуть копию проекта на локальной машине для целей разработки и тестирования.

### Prerequisites

Требования к программному обеспечению и другим инструментам для сборки, тестирования и развёртывания:

- [Node.js](https://nodejs.org/) >= 20.0.0
- [pnpm](https://pnpm.io/) 11.x (проект использует pnpm как менеджер пакетов)
- PostgreSQL (используется как база данных через `drizzle-orm` / `postgres` / `supabase`)
- Discord Bot Token и Application ID ([Discord Developer Portal](https://discord.com/developers/applications))
- В настройках приложения (вкладка **Bot**) включены привилегированные intents:
  - **Presence Intent**
  - **Server Members Intent**
  - **Message Content Intent**

### Installing

Копирование репозитория:

```bash
git clone https://github.com/14keta-dev/majestic-family-bot
cd ./majestic-family-bot
```

Установка зависимостей:

```bash
pnpm install
```

Настройка переменных окружения — создайте файл `.env` в корне проекта:

```env
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_BOT_CLIENT=your_application_id
DEVELOPER_ID=your_discord_id
PREFIX="!"
DISCORD_GUILD=discord_guild_where_bot_will_operate
DATABASE_URL=postgresql://user.project-ref:password@region.pooler.supabase.com:5432/postgres
WEBHOOK_URL=discord_webhook_for_errors
```

Подробное описание каждой переменной, включая режимы подключения Supabase (session vs transaction pooling), см. в [`.env.example`](.env.example).

Применение схемы базы данных:

```bash
pnpm db:push
```

Регистрация слэш-команд бота на сервере Discord:

```bash
pnpm deploy
```

Регистрация эмодзи бота на сервере Discord:

```bash
pnpm deploy-emojis
```

Запуск в режиме разработки (с автоперезагрузкой):

```bash
pnpm dev
```

После запуска бот появится онлайн на вашем Discord-сервере, и слэш-команды, зарегистрированные через `pnpm deploy`, станут доступны для использования — `/menu`, чтобы запустить систему заявок.

## Configuration

Бот настраивается под конкретную семью через конфигурационные файлы, без изменения основной логики.

### Embed с заявкой

Внешний вид эмбеда с меню подачи заявки (баннер, текст, статус набора) редактируется в:

```
src/embed/family_applications/apply.embed.ts
```

### Поля модального окна заявки

Типы заявок (`APPLY_TYPES`) и поля модального окна, которые видит пользователь при заполнении (`APPLY_FIELDS`), настраиваются в:

```
src/utils/config/family_applications/applyFieldPresets.ts
```

Здесь можно:
- добавлять/изменять поля анкеты (`label`, `placeholder`, `style`, `required`)
- добавлять новые типы заявок с собственным набором полей, ролью для пинга (`pingRole`) и ролями за одобрение (`rewardRoles`)

При старте бот валидирует конфигурацию (`validateApplyConfig`) и упадёт с ошибкой, если тип заявки ссылается на несуществующее поле, превышает лимит полей модалки (`MAX_MODAL_FIELDS`) или содержит дублирующиеся `id`.

После изменения не забудьте перезапустить бота, затем отправьте команду `!famq` (префикс + `famq`) в канале подачи заявок, чтобы опубликовать обновлённый эмбед.

## Running the tests

Тесты написаны на [Vitest](https://vitest.dev/).

```bash
pnpm test
```

### Sample Tests

Тесты проверяют логику проекта в изоляции от Discord API.

```bash
pnpm test
```

### Style test

Проверка соответствия кода принятому стилю и правилам линтинга выполняется через ESLint.

```bash
pnpm lint
```

## Deployment

1. Соберите проект:

   ```bash
   pnpm build
   ```

2. Запустите собранную версию:

   ```bash
   pnpm start
   ```

3. Для деплоя слэш-команд и/или кастомных эмодзи на боевой сервер:

   ```bash
   pnpm deploy
   pnpm deploy-emojis
   ```

   Для предварительной проверки без реальных изменений:

   ```bash
   pnpm deploy-emojis:dry
   ```

Убедитесь, что переменные окружения (`.env`) на продакшн-сервере настроены отдельно от локальных и что `DATABASE_URL` указывает на боевую базу данных.

## Built With

- [Discord.js](https://discord.js.org/) — взаимодействие с Discord API
- [TypeScript](https://www.typescriptlang.org/) — типизация
- [Drizzle ORM](https://orm.drizzle.team/) + [PostgreSQL](https://www.postgresql.org/) — работа с базой данных
- [Zod](https://zod.dev/) — валидация данных
- [tslog](https://tslog.js.org/) — логирование
- [tsx](https://github.com/privatenumber/tsx) / [tsup](https://tsup.egoist.dev/) — запуск и сборка TypeScript
- [Vitest](https://vitest.dev/) — тестирование
- [pnpm](https://pnpm.io/) — менеджер пакетов

## Authors

- **14keta-dev** — [14keta-dev](https://github.com/14keta-dev)

См. также список [contributors](https://github.com/14keta-dev/majestic-family-bot/contributors), участвовавших в проекте.

## License

Лицензия проекта указана в файле [LICENSE](LICENSE).

## Acknowledgments

- При возникновении проблем оставьте issue в [ISSUES](https://github.com/14keta-dev/majestic-family-bot/issues) или напишите мне в лс дискорда keta.dev(1286467439521038362)