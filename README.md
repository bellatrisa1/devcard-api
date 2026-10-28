<h1 align="center">DevCard API</h1>

<p align="center">
  Портфолио разработчика в формате read-only GraphQL API.<br />
  Профиль, навыки, опыт работы, достижения и проекты — в одном запросе.
</p>

🌐 Live Demo: https://devcard-api-0xmn.onrender.com/graphql

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/GraphQL-E10098?style=flat-square&logo=graphql&logoColor=white" alt="GraphQL" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
</p>

<p align="center">
  <a href="#быстрый-старт">Запуск</a> ·
  <a href="#graphql-api">API</a> ·
  <a href="#архитектура">Архитектура</a> ·
  <a href="#проверки">Проверки</a>
</p>

---

## О проекте

Backend-тестовое задание на **NestJS, Prisma и PostgreSQL** с code-first GraphQL-схемой и Apollo Sandbox. API предоставляет данные одного профиля и поддерживает вложенные запросы к связанным сущностям.

- 🗂️ **Реляционные данные:** 1 профиль, 27 навыков, 2 места работы, 7 достижений и 3 проекта.
- 🚀 **Запуск одной командой:** Docker Compose, автоматические миграции и заполнение БД.
- 🔎 **Интерактивная проверка:** Apollo Sandbox с готовым запросом и документацией схемы.
- 🧪 **Проверяемое поведение:** HTTP- и PostgreSQL-интеграционные тесты, включая повторный seed и отсутствие N+1.

## Быстрый старт

**Требования:** установленный и запущенный Docker Engine/Desktop с Docker Compose v2.

Из корня репозитория:

```sh
docker compose up --build
```

После запуска откройте **[http://localhost:3000/graphql](http://localhost:3000/graphql)** и нажмите **Run** в Apollo Sandbox.

При старте автоматически выполняются:

```text
Готовность PostgreSQL → применение миграций → seed → запуск API
```

Для Docker-запуска `.env` необязателен: Compose использует локальные демонстрационные значения. База доступна только внутри сети контейнеров, данные сохраняются в named volume. Приложение работает от непривилегированного пользователя.

```sh
docker compose logs app   # Логи приложения
docker compose down       # Остановка с сохранением данных БД
```

По умолчанию HTTP доступен только на loopback-порту 3000. Другой порт можно выбрать через `PORT=3001 docker compose up --build`. Флаг `down -v` удаляет данные базы.

## GraphQL API

| Адрес               | Назначение                          |
| ------------------- | ----------------------------------- |
| `GET /graphql`      | Apollo Sandbox и документация схемы |
| `POST /graphql`     | Выполнение GraphQL-запросов         |
| `GET /health/live`  | Проверка работы HTTP-приложения     |
| `GET /health/ready` | Проверка подключения к PostgreSQL   |

### Основной запрос

```graphql
query {
  profile {
    name
    description
    skills {
      name
    }
    experience {
      company
      position
    }
    projects {
      name
    }
  }
}
```

Ответ содержит профиль **Беллы Манкиевой**, навыки, опыт в Буше и Московском Кредитном Банке, проекты Orbit, Lexora и Event Form Flow App.

<details>
<summary><strong>Полный запрос: контакты, даты, достижения и ссылки</strong></summary>

```graphql
query {
  profile {
    id
    name
    headline
    description
    githubUrl
    telegramUrl
    skills {
      id
      name
    }
    experience {
      id
      company
      position
      startDate
      endDate
      achievements {
        id
        text
      }
    }
    projects {
      id
      name
      description
      repositoryUrl
      demoUrl
    }
  }
}
```

</details>

### Запрос из терминала

```sh
curl -sS http://localhost:3000/graphql \
  -H 'Content-Type: application/json' \
  --data '{"query":"query { profile { name description skills { name } experience { company position } projects { name } } }"}'
```

### Контракт и ошибки

- Корневой запрос — `profile: Profile`. Если профиль с заданным стабильным ID отсутствует, возвращается `null`.
- `id` имеет тип `ID!`; остальные скалярные поля — `String!`, кроме nullable `endDate`, `repositoryUrl` и `demoUrl`.
- Списки и их элементы non-null: `[Skill!]!`, `[Experience!]!`, `[ExperienceAchievement!]!`, `[Project!]!`.
- Даты работы возвращаются как **`YYYY-MM`**, с UTC-форматированием. Условный первый день месяца из БД не раскрывается как точный день трудоустройства.
- Неизвестные ссылки на репозитории остаются `null`. Lexora представлена как frontend-прототип.
- Неожиданные ошибки возвращаются как `Internal server error`, без SQL, credentials и stacktrace. Стандартные сообщения GraphQL-валидации сохраняются. Проверяйте поле `errors`, даже при HTTP 200.

API предоставляет только чтение. Внутренние FK, join-записи и поля сортировки не входят в публичную схему.

**Sandbox и introspection намеренно включены в production** для проверки тестового задания. Встроенный Sandbox работает с тем же origin, без включения CORS middleware. Для загрузки его интерфейса нужен доступ браузера к внешним ресурсам Apollo; аккаунт не требуется.

## Архитектура

```text
GraphQL resolver → PortfolioService → PortfolioRepository → Prisma → PostgreSQL
```

| Компонент       | Ответственность                                                  |
| --------------- | ---------------------------------------------------------------- |
| `src/portfolio` | Публичные типы, resolver, отображение данных и Prisma-запрос     |
| `src/database`  | Единый injectable PrismaService, подключение и освобождение пула |
| `src/config`    | Валидация переменных окружения                                   |
| `src/graphql`   | Настройки Apollo и безопасная обработка ошибок                   |
| `src/health`    | Независимые liveness и database readiness                        |
| `prisma`        | Схема, SQL-миграции, данные и исполнение seed                    |
| `scripts`       | Подготовка БД перед HTTP bootstrap                               |
| `test`          | HTTP- и PostgreSQL-интеграционные проверки                       |

Resolver не содержит запросов к БД. Repository не зависит от GraphQL-декораторов или HTTP. Сервис явно формирует публичный ответ и не возвращает Prisma-записи напрямую.

### Модель данных и порядок

Профиль связан с навыками через явную таблицу `ProfileSkill`. Она хранит порядок навыков, а составной ключ `(profileId, skillId)` исключает повторные связи. Работы и проекты принадлежат профилю; достижения — конкретной работе.

Внешние ключи обеспечивают целостность, индексы учитывают родителя и сортировку. Все списки упорядочены по `displayOrder`, затем по стабильному ID. Даты хранятся как PostgreSQL `DATE`; SQL CHECK запрещают отрицательный порядок и окончание работы раньше начала.

### Загрузка связей без N+1

Один `findUnique` с вложенными `include` загружает профиль и его связи. Отдельных обращений к БД для каждого навыка, места работы или достижения нет. Один вызов Prisma при этом может выполнять несколько SQL-запросов.

В PostgreSQL-интеграции измерено **6 SQL-запросов** на исходных данных и **6** после добавления 20 работ и 200 достижений. Инструментирование включено только в тесте.

Небольшой профиль загружается целиком, даже при запросе одного поля. Для больших наборов данных понадобились бы пагинация и выборочная загрузка; для текущего объёма дополнительный DataLoader не требуется.

### Миграции и повторяемый seed

Seed-данные отделены от исполнения: `prisma/portfolio-data.mjs` и `prisma/seed.mjs`. Стабильные ID/slug и upsert в одной транзакции обеспечивают повторяемость без дублей. Посторонние записи сохраняются; seed ничего не удаляет. Конфликт управляемого ID с другим владельцем откатывает транзакцию.

Startup последовательно выполняет `migrate deploy` и `db seed`. Ошибка подготовки завершает процесс ненулевым кодом до запуска HTTP. Workflow рассчитан на один экземпляр приложения; development migrations, reset и `db push` при старте не используются.

## Локальная разработка

**Требования:** Node.js 24.15+ в ветке 24 LTS, npm и PostgreSQL 17. Допустимые версии Node.js указаны в `package.json`.

```sh
npm ci
test -f .env || cp .env.example .env
```

Создайте PostgreSQL-пользователя и базу либо используйте существующие, затем укажите `DATABASE_URL` в `.env`. Для локального приложения нужен адрес `localhost`, для приложения в Compose — `db`.

```sh
npm run build
npm start
```

`npm start` автоматически применяет миграции и seed. Для watch-режима:

```sh
npm run db:prepare
npm run dev
```

Перед первым `db:prepare` и после изменений схемы/seed выполняйте `npm run build`. Watch-режим не повторяет подготовку БД при каждом сохранении.

<details>
<summary><strong>PostgreSQL в Docker, приложение локально</strong></summary>

```sh
docker compose -f compose.yaml -f compose.local.yaml up -d db
```

База публикуется на `127.0.0.1:5432`. Настройте локальный `DATABASE_URL` по [.env.example](.env.example), затем выполните команды локального запуска выше.

</details>

### Переменные окружения

| Переменная          | Назначение                          | По умолчанию               |
| ------------------- | ----------------------------------- | -------------------------- |
| `DATABASE_URL`      | PostgreSQL connection URL           | Обязательна для приложения |
| `PORT`              | HTTP-порт, 1–65535                  | `3000`                     |
| `NODE_ENV`          | `development`, `test`, `production` | `development`              |
| `POSTGRES_USER`     | Пользователь БД в Compose           | `devcard`                  |
| `POSTGRES_PASSWORD` | Локальный пароль БД в Compose       | См. `.env.example`         |
| `POSTGRES_DB`       | Имя БД в Compose                    | `devcard`                  |

Compose задаёт контейнерный `DATABASE_URL` самостоятельно. Пример предназначен для локальной разработки; `.env` исключён из Git. Для credentials Compose используйте URL-безопасные значения. Изменение переменных не меняет пользователей существующего PostgreSQL volume. Приложение валидирует окружение и слушает `0.0.0.0:$PORT`.

### Команды базы данных

| Команда                                        | Назначение                      |
| ---------------------------------------------- | ------------------------------- |
| `npm run prisma:generate`                      | Генерация Prisma Client         |
| `npm run prisma:validate`                      | Проверка Prisma schema          |
| `npm run db:migrate:dev -- --name change_name` | Создание миграции в разработке  |
| `npm run db:migrate:deploy`                    | Применение сохранённых миграций |
| `npm run db:seed`                              | Заполнение БД после сборки      |
| `npm run db:prepare`                           | Миграции и seed после сборки    |

## Проверки

```sh
npm run build
npm run lint
npm run format:check
npm run prisma:validate
npm test
```

`npm test` проверяет конфигурацию, GraphQL HTTP и health endpoints. Отдельный запуск GraphQL HTTP-теста: `npm run test:graphql`.

Для интеграций с PostgreSQL передайте `TEST_DATABASE_URL` тестового сервера:

```sh
TEST_DATABASE_URL='postgresql://USER:PASSWORD@localhost:5432/postgres' npm run test:database
```

URL выше — шаблон. Пользователю БД нужно право `CREATEDB`; параметр `schema` в URL не используется. Каждый тест создаёт БД с уникальным именем и удаляет только её в `finally`. Существующая БД не сбрасывается.

**Покрытые сценарии:** чистая миграция, повторный seed, сохранение посторонних записей, откат при конфликте, точный и полный GraphQL-запросы, порядок, даты, nullable ссылки, отсутствующий профиль, безопасные ошибки и количество SQL-запросов.

Docker-сборка и Compose проверены на **Linux/arm64**: автоматическая подготовка чистой БД, повторный startup, non-root runtime, отказ/восстановление PostgreSQL и graceful shutdown. Запрос из задания также выполнен через Sandbox в Chromium против контейнерного приложения.

### Health checks

```sh
curl -i http://localhost:3000/health/live
curl -i http://localhost:3000/health/ready
```

`live` возвращает `200` без обращения к БД. `ready` выполняет Prisma `SELECT 1`: `200` при доступной БД, `503` и `{"status":"unavailable"}` при отказе. Потеря БД после старта не останавливает HTTP-процесс. Shutdown hooks освобождают Prisma pool при завершении приложения.
