# Render: подготовка, без развёртывания

Выбран один способ: **Render Dashboard → Dockerfile из репозитория**, один Web Service и одна Render PostgreSQL. `render.yaml` намеренно не добавлен: регион и тариф каждого ресурса пользователь выбирает до создания, без неявного платного плана. Ни ресурсы, ни публичный URL пока не созданы.

## Перед созданием ресурсов

1. Выполните проверки из README и [отдельную Docker-приёмку](docker-acceptance.md). Проверьте Sandbox в браузере.
2. Проверьте, что выбранная ветка репозитория содержит актуальные исходники, исправленный lockfile, миграции и Dockerfile. Локальный Git уже содержит коммит и настроенный remote; последние изменения должны быть сохранены и опубликованы пользователем перед deploy. Не добавляйте `.env`, build artifacts или `node_modules`. Агент не выполняет commit/push.
3. В Dashboard проверьте доступные **сейчас** планы, стоимость, срок хранения БД, ограничения и резервное копирование. Выберите подходящие условия отдельно для БД и Web Service. Здесь нет обещаний о бесплатном тарифе.

## Настройки PostgreSQL

Создайте одну Render PostgreSQL в выбранном регионе. Используйте PostgreSQL 17, если он доступен, чтобы совпадать с проверенной локальной версией. Для Web Service выберите тот же аккаунт/регион и возьмите **Internal Database URL** из Connect/Info. URL хранится только в секретной переменной окружения сервиса, не в файлах или Git.

Приложение передаёт DATABASE_URL напрямую драйверу pg через PrismaPg, а Prisma CLI читает ту же переменную. URL с `postgresql://` и параметрами соединения поддерживается. Для подключения внутри Render используйте внутренний URL, как выдан Dashboard. Не добавляйте `rejectUnauthorized: false` в код. Особенности TLS внутреннего подключения и внешнего доступа сверяйте с [Render PostgreSQL connection docs](https://render.com/docs/postgresql-creating-connecting); реальное соединение с Render в этой работе не выполнялось.

## Настройки Web Service

При New → Web Service подключите свой реальный репозиторий и нужную ветку. Подключение Git-провайдера и кнопка создания ресурса выполняются пользователем.

| Настройка            | Значение                                 |
| -------------------- | ---------------------------------------- |
| Language / runtime   | Docker                                   |
| Root Directory       | корень репозитория                       |
| Dockerfile Path      | `./Dockerfile`                           |
| Docker Build Context | `.`                                      |
| Docker Command       | оставить пустым, использовать CMD образа |
| Health Check Path    | `/health/ready`                          |
| Instances            | один экземпляр                           |
| Auto-deploy          | выключить для управляемой ручной приёмки |
| Region               | тот же, что у PostgreSQL                 |
| Plan                 | выбрать вручную после проверки условий   |

Переменные сервиса:

| Переменная     | Значение                                           |
| -------------- | -------------------------------------------------- |
| `NODE_ENV`     | `production`                                       |
| `PORT`         | `10000`                                            |
| `DATABASE_URL` | секрет: Internal Database URL созданной PostgreSQL |

`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` нужны только локальному Compose, на Web Service их добавлять не нужно. Не загружайте `.env` как secret file. Не передавайте DATABASE_URL в Dockerfile ARG/ENV или build command: сборка не обращается к БД.

Docker CMD: `node scripts/start.mjs`. Он применяет сохранённые SQL-миграции (`prisma migrate deploy`), выполняет `prisma db seed` и импортирует compiled Nest application. Не добавляйте дублирующий pre-deploy command. Ошибка миграции/seed завершает процесс ненулевым кодом до HTTP bootstrap. Production image содержит Prisma CLI, runtime client, compiled JS, config, миграции и seed; dev runner для старта не нужен.

HTTP слушает `0.0.0.0:$PORT`. `/health/ready` выполняет лёгкую проверку БД с ограниченными таймаутами и возвращает 200/503. Render проверяет HTTP health и может перезапускать сервис при повторных отказах, поэтому потеря БД будет отражаться и на доступности сервиса. При SIGTERM Nest освобождает Prisma pool через shutdown hooks. Дополнительный persistent disk Web Service не нужен: данные находятся в PostgreSQL.

## Когда пользователь решит развернуть

1. Ещё раз проверьте настройки, план и секретную переменную, затем сами нажмите Create/Deploy.
2. Дождитесь успешной сборки и сообщений `Database migrate deploy completed.`, `Database db seed completed.`, затем успешного health check. Не публикуйте полные env или connection strings в логах/скриншотах.
3. Используйте **фактический URL, выданный Render**, а не выдуманный адрес. Проверьте `/health/live`, `/health/ready`, откройте `/graphql` и выполните точный и полный запросы из README.
4. Перезапустите один сервис и убедитесь, что seed не создаёт дубликаты. Проверьте логи на неожиданные ошибки. Для изменения данных seed обновляйте управляемые записи в исходниках; схема меняется новой миграцией.

Sandbox и introspection намеренно открыты также в production для read-only тестового демо. Для интерфейса нужен доступ к внешним ресурсам Apollo. Публичная работоспособность, Render networking/TLS, health routing и hosted graceful shutdown будут подтверждены только после реального deploy пользователем.

Подход рассчитан на один экземпляр демо. При обновлении Render может кратковременно держать старый и новый процессы одновременно; не запускайте разные изменяющие seed-версии параллельно и не включайте ручное масштабирование без пересмотра workflow.

Источники: [Docker on Render](https://render.com/docs/docker), [Web Services](https://render.com/docs/web-services), [Health Checks](https://render.com/docs/health-checks), [Deploys и SIGTERM](https://render.com/docs/deploys). Настройки сверены с официальной документацией; цены и наличие тарифов не фиксировались.
