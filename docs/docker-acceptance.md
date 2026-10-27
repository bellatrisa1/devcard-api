# Локальная приёмка Docker и Sandbox

Процедура повторения контейнерной приёмки. Успешный прогон выполнен 27.10.2026; результаты — в [отчёте](acceptance.md). Нужны Docker CLI, работающий daemon и Compose v2. Стек использует новое имя проекта и свой volume, не обычный devcard volume.

В одном терминале из корня проекта:

```sh
docker version
docker info
docker compose version
# Убедитесь, что порт свободен; иначе выберите другой ниже:
lsof -nP -iTCP:33045 -sTCP:LISTEN
acceptance_project="devcard-acceptance-$(date +%Y%m%d%H%M%S)"
acceptance_port=33045
dc_accept() {
  PORT="$acceptance_port" docker compose --env-file .env.example \
    -f compose.yaml -p "$acceptance_project" "$@"
}
dc_accept up --build -d --wait
dc_accept ps
curl -i "http://127.0.0.1:$acceptance_port/health/live"
curl -i "http://127.0.0.1:$acceptance_port/health/ready"
```

Не переиспользуйте имя существующего проекта. Не подключайте compose.local.yaml: acceptance PostgreSQL не должен публиковаться на хост.

Количество записей на чистой БД и после перезапуска:

```sh
acceptance_counts() {
  dc_accept exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
SELECT
  (SELECT count(*) FROM "Profile") AS profiles,
  (SELECT count(*) FROM "Skill") AS skills,
  (SELECT count(*) FROM "ProfileSkill") AS profile_skills,
  (SELECT count(*) FROM "Experience") AS experience,
  (SELECT count(*) FROM "ExperienceAchievement") AS achievements,
  (SELECT count(*) FROM "Project") AS projects;
SQL
}
acceptance_counts
# Ожидается: 1, 27, 27, 2, 7, 3.
curl -sS "http://127.0.0.1:$acceptance_port/graphql" \
  -H 'Content-Type: application/json' \
  --data '{"query":"query { profile { name description skills { name } experience { company position } projects { name } } }"}'
dc_accept restart app
# Дождитесь healthy в ps, затем повторите:
dc_accept ps
acceptance_counts
curl -i "http://127.0.0.1:$acceptance_port/health/ready"
```

Проверьте Буше → МКБ, Orbit → Lexora → Event Form Flow App и 27 навыков в порядке README/seed. Полный запрос из README должен вернуть 3 и 4 достижения у соответствующих работ, даты YYYY-MM и null у неизвестных repositoryUrl.

Отказ БД и graceful shutdown только этого acceptance-стека:

```sh
dc_accept stop db
curl -i "http://127.0.0.1:$acceptance_port/health/live"
# 200
curl -i "http://127.0.0.1:$acceptance_port/health/ready"
# 503, без внутренних деталей
dc_accept start db
# Дождитесь healthy и повторите ready: 200.
dc_accept logs app
dc_accept stop -t 15 app
dc_accept ps -a
# Не должно быть SIGKILL/137 или сообщений об ошибке закрытия соединений.
dc_accept down
```

Проверяйте runtime logs локально: сообщения подготовки БД, отсутствие неожиданных ошибок, URL с паролями и токенов. `down` здесь сохраняет даже тестовый volume; не удаляйте посторонние volumes/контейнеры.

## Sandbox вручную

1. Пока acceptance app работает, откройте `http://127.0.0.1:33045/graphql` (или выбранный порт).
2. Дождитесь загрузки Apollo Sandbox и успешного соединения. Откройте Documentation/Schema: root query — profile, mutation отсутствует.
3. В редакторе уже предложен запрос к profile. Вставьте точный многострочный запрос работодателя из README и нажмите кнопку выполнения Operation/Run.
4. В Response ожидается `data.profile.name: "Белла Манкиева"`, навыки, две работы и три проекта; `errors` отсутствует. Выполните полный запрос из README.
5. Если iframe не загрузился, проверьте доступ браузера к CDN/сервисам Apollo. HTML 200 не доказывает загрузку интерфейса. Не вводите Render credentials в Sandbox Headers: для этого read-only API они не нужны.

## Если Docker установлен, но команда не найдена

На macOS при установке CLI в пользовательскую папку откройте новый терминал. Если `docker` всё ещё не находится, добавьте каталог в PATH текущей сессии:

```sh
export PATH="$HOME/.docker/bin:$PATH"
docker version
```

Сам Docker Desktop должен быть запущен. Менять исходники приложения для этого не требуется.
