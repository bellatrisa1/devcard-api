# DevCard API

Read-only GraphQL API портфолио разработчика: профиль, навыки, опыт работы, достижения и проекты. Выполнено как backend-тестовое задание на NestJS и PostgreSQL.

**[Быстрый старт](#быстрый-старт)** · **[GraphQL](#graphql-api)** · **[Архитектура](#архитектура)** · **[Проверки](#проверки)** · **[Render](#развёртывание)**

## Стек

| Назначение      | Технологии                                                     |
| --------------- | -------------------------------------------------------------- |
| Язык и runtime  | TypeScript 6, Node.js                                          |
| HTTP и GraphQL  | NestJS 12, Apollo Server 5, code-first схема                   |
| Данные          | PostgreSQL 17, Prisma 7 и PostgreSQL driver adapter            |
| Проверки        | Node.js Test Runner, Nest Testing, Supertest, ESLint, Prettier |
| Сборка и запуск | npm lockfile, multi-stage Dockerfile, Docker Compose           |

## Быстрый старт

### Через Docker

Нужны **установленный и запущенный Docker Engine/Desktop** и Docker Compose v2.

```sh
docker compose up --build
```

При первом запуске автоматически выполняются:

```text
PostgreSQL healthcheck → migrate deploy → seed → NestJS
```

Откройте **[localhost:3000/graphql](http://localhost:3000/graphql)** и нажмите **Run** в Apollo Sandbox. Начальный запрос уже подготовлен. Устанавливать Node.js на хост или вручную заполнять БД для этого способа не требуется.

По умолчанию Compose использует локальные демонстрационные настройки из `compose.yaml`; `.env` необязателен. База доступна только внутри сети как `db:5432`, данные сохраняются в named volume. Runtime приложения работает от пользователя `node`.

```sh
docker compose logs app
docker compose down
```

`down` сохраняет БД. Флаг `-v` удаляет её volume.

> Docker-сборка и запуск на чистой БД проверены 27.10.2026 на Docker Desktop (Linux/arm64), включая повторный seed, отказ/восстановление БД и graceful shutdown. Для повторения проверки есть [инструкция приёмки](docs/docker-acceptance.md).

### Без Docker

Нужны **Node.js 24.15+ в ветке 24 LTS**, npm и запущенный PostgreSQL 17. Поддерживаемые версии Node.js также указаны в `package.json`.

```sh
npm ci
test -f .env || cp .env.example .env
```

Создайте локальную БД и пользователя либо используйте существующие. Укажите соответствующий `DATABASE_URL` в `.env`. Файл-пример сам по себе **не создаёт** PostgreSQL, пользователя или базу.

```sh
npm run build
npm start
```

`npm start` читает `.env`, применяет сохранённые миграции, запускает seed и затем HTTP-сервер. Ошибка миграции или seed останавливает запуск с ненулевым кодом. Адрес Sandbox тот же: **http://localhost:3000/graphql**. Для остановки нажмите `Ctrl+C`.

Для разработки с перезапуском при изменениях:

```sh
npm run build
npm run db:prepare
npm run dev
```

Watch-режим не запускает миграции и seed при каждом сохранении. Повторяйте подготовку БД после изменения миграций или seed; перед ней пересоберите проект.

При желании можно запустить только PostgreSQL в Docker, а приложение — локально:

```sh
docker compose -f compose.yaml -f compose.local.yaml up -d db
```

Этот override открывает БД на `127.0.0.1:5432`. Для локального Node.js используйте `localhost`, для приложения внутри Compose — `db`.

## Конфигурация

| Переменная          | Назначение                             | Значение по умолчанию      |
| ------------------- | -------------------------------------- | -------------------------- |
| `DATABASE_URL`      | PostgreSQL connection URL              | Обязательна для приложения |
| `PORT`              | HTTP-порт, от 1 до 65535               | `3000`                     |
| `NODE_ENV`          | `development`, `test` или `production` | `development`              |
| `POSTGRES_USER`     | Пользователь БД в Compose              | `devcard`                  |
| `POSTGRES_PASSWORD` | Локальный пароль БД в Compose          | См. `.env.example`         |
| `POSTGRES_DB`       | Имя БД в Compose                       | `devcard`                  |

Пример локального URL приведён в [.env.example](.env.example). Значения предназначены для разработки. Пароли с особыми символами в URL требуют percent-encoding; Compose формирует URL из своих переменных, поэтому используйте для них URL-безопасные значения. Изменение переменных не меняет пользователей уже существующего PostgreSQL volume.

Конфигурация проверяется при запуске. `.env`, локальные данные PostgreSQL, `node_modules` и сгенерированные файлы исключены из Git. Приложение слушает `0.0.0.0` и порт из окружения.

## GraphQL API

**Endpoint:** `POST /graphql` · **Apollo Sandbox:** `GET /graphql`

Корневой запрос `profile: Profile` возвращает профиль с фиксированным seed ID. Если он отсутствует, результат — `profile: null`; посторонний профиль не подставляется. API предоставляет только чтение, без mutations и subscriptions.

### Запрос из задания

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

В ответе — **Белла Манкиева**, 27 навыков, 2 места работы и 3 проекта. Полный запрос также возвращает 7 достижений.

<details>
<summary><strong>Полный запрос всех публичных полей</strong></summary>

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

### Проверка через curl

```sh
curl -sS http://localhost:3000/graphql \
  -H 'Content-Type: application/json' \
  --data '{"query":"query { profile { name description skills { name } experience { company position } projects { name } } }"}'
```

### Контракт данных

| Тип                     | Публичные поля                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `Profile`               | `id`, `name`, `headline`, `description`, `githubUrl`, `telegramUrl`, `skills`, `experience`, `projects` |
| `Skill`                 | `id`, `name`                                                                                            |
| `Experience`            | `id`, `company`, `position`, `startDate`, `endDate`, `achievements`                                     |
| `ExperienceAchievement` | `id`, `text`                                                                                            |
| `Project`               | `id`, `name`, `description`, `repositoryUrl`, `demoUrl`                                                 |

Все `id` имеют тип `ID!`, остальные скалярные поля — `String!`, кроме nullable `endDate`, `repositoryUrl` и `demoUrl`. Списки и их элементы non-null: `[Skill!]!`, `[Experience!]!`, `[ExperienceAchievement!]!`, `[Project!]!`. Пустые списки возвращаются как `[]`. Внутренние FK, join-записи и поля сортировки в API не раскрываются.

Даты работы передаются как **`YYYY-MM`** с UTC-форматированием. В БД используется `DATE`: первый день месяца — условность хранения, а не точная дата трудоустройства. Неизвестные repository URL у Lexora и Event Form Flow App сохраняются как `null`. Lexora описана как frontend-прототип.

### Sandbox и ошибки

Introspection и встроенный Apollo Sandbox явно включены **также в production**, чтобы проверяющий мог изучить схему и выполнить запросы публичного read-only демо. Интерфейс требует доступа браузера к внешним ресурсам CDN и сервисов Apollo; аккаунт Apollo не нужен.

Встроенный Sandbox отправляет запросы через страницу с тем же origin, поэтому CORS middleware не включён. Подключение отдельного hosted Studio с другого origin не предусмотрено.

Неожиданные ошибки возвращаются как `Internal server error` с кодом `INTERNAL_SERVER_ERROR`, без stacktrace, SQL или credentials. В журнал выводится фиксированное сообщение без исходного payload. Стандартные ошибки синтаксиса и валидации GraphQL сохраняют полезные сообщения. Проверяйте поле `errors` в JSON: HTTP 200 само по себе не означает успешную GraphQL-операцию.

## Архитектура

```text
src/
├── main.ts                  # HTTP bootstrap и shutdown hooks
├── config/                  # Проверка переменных окружения
├── database/                # Injectable PrismaService и lifecycle пула
├── graphql/                 # Apollo options и безопасная обработка ошибок
├── health/                  # Liveness и readiness
└── portfolio/
    ├── portfolio.types.ts       # Code-first публичные типы
    ├── portfolio.resolver.ts    # Корневой GraphQL query
    ├── portfolio.service.ts     # Явное отображение данных в публичный ответ
    ├── portfolio.repository.ts  # Prisma-запрос и сортировка связей
    └── portfolio.identity.ts    # Общий ID для API и seed
prisma/                      # Схема, SQL-миграции, данные и исполнение seed
scripts/                     # Подготовка БД перед запуском
test/                       # HTTP и PostgreSQL-интеграции
```

Resolver не обращается к Prisma напрямую. Database access не зависит от GraphQL-декораторов или HTTP; сервис явно формирует публичный ответ. PrismaService предоставляется через Nest DI и закрывает подключения при завершении приложения.

### Модель и порядок

`Profile` связан с навыками через явную таблицу `ProfileSkill`, а с работами и проектами — через внешние ключи. Достижения принадлежат конкретной работе.

Явная связь `ProfileSkill` позволяет хранить порядок навыков внутри профиля. Составной primary key `(profileId, skillId)` исключает повторную связь, а уникальный slug идентифицирует навык.

Каждый список сортируется по `displayOrder`, затем по стабильному ID; для связи навыков вторым ключом служит `skillId`. Индексы учитывают родительский FK и порядок. SQL CHECK запрещают отрицательный порядок и окончание работы раньше её начала. FK обеспечивают целостность связей; удаление профиля каскадно удаляет его дочерние записи, а удаление используемого навыка ограничено.

### Загрузка связей без N+1

Repository выполняет один `findUnique` с вложенными `include` для навыков, работ, достижений и проектов. Отдельных запросов на каждый элемент нет. **Один вызов Prisma не означает один SQL-запрос.**

На реальном PostgreSQL измерено **6 SQL statements** и на seed-данных, и после добавления 20 работ с 200 достижениями. Инструментирование включено только в тесте; он сравнивает количество запросов, не фиксируя их SQL-текст.

Компромисс: маленький профиль загружается целиком даже при запросе одного поля. Для больших наборов данных потребовались бы пагинация, выборочная загрузка и, при необходимости, request-scoped batching. Для текущего объёма DataLoader не требуется.

## Миграции и seed

| Команда                                        | Назначение                                       |
| ---------------------------------------------- | ------------------------------------------------ |
| `npm run prisma:generate`                      | Сгенерировать Prisma Client                      |
| `npm run prisma:validate`                      | Проверить Prisma schema                          |
| `npm run db:migrate:dev -- --name change_name` | Создать миграцию в разработке                    |
| `npm run db:migrate:deploy`                    | Применить сохранённые миграции                   |
| `npm run db:seed`                              | Запустить seed после сборки                      |
| `npm run db:prepare`                           | Применить миграции и выполнить seed после сборки |

Данные отделены в `prisma/portfolio-data.mjs`, исполнение — в `prisma/seed.mjs`. Seed использует стабильные ID/slug и upsert в одной транзакции. Повторный запуск восстанавливает известные поля и порядок без дублей, сохраняя посторонние записи. Конфликт управляемого ID с другим владельцем откатывает транзакцию.

Seed ничего не удаляет: удаление элемента из файла не удаляет его из БД. При необходимости очистка должна быть отдельным явно ограниченным изменением. Подключения закрываются и при успехе, и при ошибке.

Prisma 7 запускает seed явно через `migrations.seed` в `prisma.config.ts`. Поэтому startup последовательно вызывает `migrate deploy` и `db seed`. Development migrations, reset и `db push` при старте не используются. Подход рассчитан на один экземпляр демо; новые изменения схемы оформляются новыми миграциями.

## Проверки

```sh
npm run build
npm run lint
npm run format:check
npm run prisma:validate
npm test
```

`npm test` включает HTTP GraphQL/health и проверку конфигурации. Отдельный запуск GraphQL HTTP-теста: `npm run test:graphql`.

Интеграции с PostgreSQL:

```sh
TEST_DATABASE_URL='postgresql://USER:PASSWORD@localhost:5432/postgres' npm run test:database
```

Это шаблон URL тестового сервера; реальные credentials передавайте через окружение. Пользователю БД нужно право `CREATEDB`; URL должен быть без параметра `schema`. Каждый тест создаёт БД с уникальным именем и удаляет только её в `finally`. Существующая БД не сбрасывается; без `TEST_DATABASE_URL` тесты не используют `.env` разработчика автоматически.

Проверяются миграция на чистой БД, повторяемость seed, сохранность посторонних данных, транзакционный откат, точный и полный GraphQL-запросы, порядок, даты, nullable ссылки, обработка ошибок и отсутствие N+1.

### Health endpoints

| Endpoint            | Успешный ответ           | Зависимость от БД |
| ------------------- | ------------------------ | ----------------- |
| `GET /health/live`  | `200`, `{"status":"ok"}` | Нет               |
| `GET /health/ready` | `200`, `{"status":"ok"}` | Prisma `SELECT 1` |

При недоступной БД readiness возвращает `503`, `{"status":"unavailable"}` без внутренних подробностей. Потеря БД после старта не останавливает HTTP-процесс; проверка повторяется при следующем запросе.

```sh
curl -i http://localhost:3000/health/live
curl -i http://localhost:3000/health/ready
```

## Развёртывание

Подготовлен вариант **Render: один Docker Web Service и одна PostgreSQL**. Инструкция описывает переменные окружения, internal connection, `/health/ready`, startup и выбор региона/тарифа: **[настройка Render](docs/render.md)**.

Публичный экземпляр пока не развёрнут. Docker-сборка, Compose startup и интерфейс Sandbox проверены: точный запрос выполнен в Chromium против контейнерного приложения в production-режиме. Подробные результаты вынесены в **[отчёт приёмки](docs/acceptance.md)**.

## Работа с кодом

```sh
npm run format        # Форматирование исходников и документации
npm run format:check  # Проверка без изменения файлов
```

Для форматирования при сохранении установите рекомендованное расширение VS Code **Prettier — Code formatter**. Настройки находятся в `.prettierrc.json` и `.vscode/settings.json`. Env-файлы, локальная БД, SQL-миграции и generated/build artifacts исключены. Prisma schema форматируется через `npx prisma format`.
