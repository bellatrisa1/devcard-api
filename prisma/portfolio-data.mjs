import { PORTFOLIO_PROFILE_ID } from '../dist/portfolio/portfolio.identity.js';

export const profile = {
  id: PORTFOLIO_PROFILE_ID,
  name: 'Белла Манкиева',
  headline: 'Frontend / Full-stack Developer',
  description:
    'С 2022 года разрабатываю веб-приложения на react и typescript. Работаю со сложными формами, бизнес-логикой, состоянием приложения и REST API. Развиваю full-stack проекты на next.js, node.js и postgresql, также работала с react native. Люблю разбираться в существующем коде, создавать удобные приложения и разрабатывать Telegram-ботов.',
  githubUrl: 'https://github.com/bellatrisa1',
  telegramUrl: 'https://t.me/bellatrix_bb',
};

// Slugs and IDs are persisted keys; changing a display name must not change its key.
export const skills = [
  ['javascript', 'javascript'],
  ['typescript', 'typescript'],
  ['react', 'react'],
  ['nextjs', 'next.js'],
  ['react-native', 'react native'],
  ['redux-toolkit', 'redux toolkit'],
  ['tanstack-query', 'tanstack query'],
  ['zustand', 'zustand'],
  ['react-hook-form', 'react hook form'],
  ['html', 'html'],
  ['css', 'css'],
  ['scss', 'scss'],
  ['nodejs', 'node.js'],
  ['express', 'express'],
  ['postgresql', 'postgresql'],
  ['rest-api', 'REST API'],
  ['websocket', 'WebSocket'],
  ['sse', 'SSE'],
  ['git', 'Git'],
  ['vite', 'vite'],
  ['webpack', 'webpack'],
  ['vitest', 'vitest'],
  ['playwright', 'playwright'],
  ['python', 'python'],
  ['telegram-bot-api', 'Telegram Bot API'],
  ['claude-code', 'claude code'],
  ['codex', 'codex'],
].map(([slug, name], displayOrder) => ({ id: `skill-${slug}`, slug, name, displayOrder }));

export const experience = [
  {
    id: 'experience-bushe',
    company: 'Буше',
    position: 'Frontend-разработчик',
    startDate: '2025-03-01',
    endDate: '2026-08-01',
    achievements: [
      {
        id: 'bushe-interfaces',
        text: 'Разрабатывала и поддерживала интерфейсы на react и typescript.',
      },
      {
        id: 'bushe-state-api',
        text: 'Работала с состоянием приложения и пользовательскими сценариями, интегрировала интерфейсы с backend через REST API.',
      },
      {
        id: 'bushe-refactoring',
        text: 'Исправляла ошибки, проводила рефакторинг и улучшала пользовательский опыт.',
      },
    ],
  },
  {
    id: 'experience-mkb',
    company: 'Московский Кредитный Банк',
    position: 'Frontend-разработчик',
    startDate: '2022-12-01',
    endDate: '2025-03-01',
    achievements: [
      {
        id: 'mkb-forms',
        text: 'Разрабатывала динамические формы с взаимозависимыми полями, валидацией и сложной бизнес-логикой.',
      },
      {
        id: 'mkb-field-sync',
        text: 'Реализовывала синхронизацию полей и обработку пограничных случаев.',
      },
      {
        id: 'mkb-redux-migration',
        text: 'Выполнила миграцию управления состоянием с redux thunk на redux toolkit, сократив шаблонный код.',
      },
      {
        id: 'mkb-rest-api',
        text: 'Работала с REST API, асинхронными запросами, состояниями загрузки и ошибками.',
      },
    ],
  },
];

export const projects = [
  {
    id: 'project-orbit',
    name: 'Orbit',
    description:
      'Приложение для управления проектами и задачами на next.js, typescript и postgresql. Реализованы рабочие пространства, роли и права доступа, Kanban-доска, совместная работа, SSE-синхронизация и оптимистичные обновления. Ключевые сценарии покрыты тестами.',
    repositoryUrl: 'https://github.com/bellatrisa1/saas-application',
    demoUrl: 'https://saas-application-iiic.onrender.com',
  },
  {
    id: 'project-lexora',
    name: 'Lexora',
    description:
      'Frontend-прототип рабочего пространства юридической команды. Управление делами, клиентами, документами и задачами, поиск и фильтрация, типизированный API-слой с mock-адаптером, демонстрационные роли и адаптивный интерфейс. Использованы next.js, typescript, tanstack query, vitest и playwright.',
    repositoryUrl: null,
    demoUrl: 'https://lexora-legal-workspace.vercel.app',
  },
  {
    id: 'project-event-form-flow',
    name: 'Event Form Flow App',
    description:
      'Full-stack приложение для создания и управления формами мероприятий. Реализованы регистрация и вход, создание, редактирование, клонирование и удаление форм, поиск, сортировка и аналитика. Стек: react, typescript, redux toolkit, node.js, express и JWT.',
    repositoryUrl: null,
    demoUrl: 'https://event-formflow-app.onrender.com',
  },
];
