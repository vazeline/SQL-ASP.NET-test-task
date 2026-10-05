# Справочник сотрудников — ASP.NET Core Web API + Next.js

Небольшое приложение: список сотрудников с поиском, фильтром по статусу, серверной
пагинацией, добавлением и редактированием через модальное окно.

- Backend: REST API `/api/employees` (`net9.0`, EF Core, только API — MVC/Razor удалён)
- Frontend: Next.js 16 (App Router, React 19, TypeScript), Tailwind CSS 4, Zustand
- Хранилище: MS SQL Server через EF Core (`Microsoft.EntityFrameworkCore.SqlServer 9.0.9`)
- Миграции не используются: схему и начальные данные создаёт SQL-скрипт

## Требования

- .NET 9 SDK (проект `net9.0`)
- Node.js 20+ (проверено на 25.3.0) и npm
- Microsoft SQL Server (проверено на LocalDB `(localdb)\MSSQLLocalDB`)

## Запуск

1. Создать базу и загрузить 7 сотрудников:

   ```powershell
   sqlcmd -S "(localdb)\MSSQLLocalDB" -E -f 65001 -i "db\01_schema_and_seed.sql"
   ```

   Либо, если экземпляр с латинской коллацией (обычный LocalDB) и `VARCHAR` из ТЗ
   портит кириллицу, — тестовый вариант с `NVARCHAR`:

   ```powershell
   sqlcmd -S "(localdb)\MSSQLLocalDB" -E -f 65001 -i "db\02_schema_and_seed_latin_nvarchar.sql"
   ```

   Этот скрипт создаёт `EmployeesDb` с коллацией `SQL_Latin1_General_CP1_CI_AS`
   и **удаляет базу целиком**, если она уже есть. Приложение работает с обоими
   вариантами без изменений кода.

2. При необходимости поправить строку подключения в `Employees\appsettings.json`:

   ```json
   "EmployeesDb": "Server=...;Database=EmployeesDb;Trusted_Connection=True;TrustServerCertificate=True"
   ```

3. Запустить API (порт `5089` — как в http-профиле `launchSettings.json`):

   ```powershell
   dotnet run --project Employees
   ```

4. Запустить фронтенд в отдельном терминале:

   ```powershell
   cd client
   npm install
   npm run dev
   ```

   Открыть <http://localhost:3000>.

> **Важно про кодировку.** По ТЗ текстовые колонки — `VARCHAR`, поэтому база должна
> использовать коллацию, поддерживающую кириллицу (`Russian_CI_AS` и т. п.). На сервере
> с латинской коллацией (`SQL_Latin1_General_CP1_CI_AS`) литералы `N'Иванов'` приведут к
> `??????`. Для таких случаев есть локальный тестовый скрипт с `NVARCHAR`
> (`db\02_schema_and_seed_latin_nvarchar.sql`); рабочий вариант по ТЗ —
> `db\01_schema_and_seed.sql`.

> **Важно про имя папки.** Символ `#` в пути ломает резолвер Tailwind v4
> (`@tailwindcss/node` превращает `C#` в путь с NUL-байтом), и ни `next build`,
> ни `next dev`, ни `@tailwindcss/cli` не могут собрать CSS. Поэтому папка задачи
> называется `2 CSharp ASP.NET SQL` — без `#`.

## Конфигурация фронтенда

| Переменная | Где | Назначение |
|------------|-----|-----------|
| `API_ORIGIN` | `client\.env.local` (шаблон — `client\.env.example`) | Адрес API для server-компонентов и для прокси |

Значение по умолчанию — `http://localhost:5089`. Правится в одном месте;
`next start` читает `API_ORIGIN` при старте, поэтому после изменения нужен
перезапуск (и пересборка для production).

## Как устроен фронтенд

- **URL — источник правды.** Поиск, статус и номер страницы живут в query
  string. `src/app/page.tsx` — Server Component: он читает `await props.searchParams`,
  сам ходит в API (`cache: "no-store"`) и рендерит `EmployeesScreen`.
- **Клиент только для интерактива.** Изменение фильтра вызывает
  `router.replace(..., { scroll: false })`, а после CRUD — `router.refresh()`:
  данные всегда приходят с сервера, без дублирования выборки в браузере.
- **Zustand** (`src/store/employees-store.ts`) хранит только состояние UI:
  открытые модальные окна, значения форм, ошибки валидации, удаляемую запись.
- **Прокси вместо CORS.** `next.config.ts` перенаправляет `/api/*` на
  `${API_ORIGIN}/api/*`, поэтому браузер ходит только на свой origin, а CORS-политики
  на backend не нужны.
- **Ошибки.** Недоступный API, `4xx`/`5xx` и `ValidationProblemDetails` из ASP.NET Core
  показываются в интерфейсе; при недоступном API страница рендерится с предложением
  повторить запрос.

## Проверки

```powershell
cd client
npm run typecheck   # next typegen && tsc --noEmit
npm run lint        # eslint
npm run build       # production-сборка
npm run verify      # все три сразу
```

> `npm audit` сообщает о 5 уязвимостях high в `braces`. Цепочка
> `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`
> используется только при линте, в рантайм Next.js не попадает. Апстрим-фикса для
> `braces` нет (уже стоит 3.0.3), а предложенный npm «фикс» понижает
> `eslint-config-next` до 14.x — этого делать не нужно.

## API

| Метод    | URL                                | Назначение |
|----------|------------------------------------|------------|
| `GET`    | `/api/employees`                   | Список с фильтрами и пагинацией |
| `GET`    | `/api/employees/{id}`              | Один сотрудник |
| `POST`   | `/api/employees`                   | Создать |
| `PUT`    | `/api/employees/{id}`              | Изменить |
| `DELETE` | `/api/employees/{id}`              | Удалить (физически) |
| `DELETE` | `/api/employees/{id}?soft=true`    | Снять активность (`is_active = 0`) |

Параметры `GET /api/employees`:

| Параметр  | Значение | По умолчанию | Примечание |
|-----------|----------|--------------|------------|
| `search`  | строка   | — | подстрока по имени, отчеству и фамилии; `%` и `_` экранируются |
| `status`  | `all` / `active` / `terminated` | `all` | `active` — `edate IS NULL`, `terminated` — `edate IS NOT NULL`; другое значение → `400` |
| `page`    | int      | `1` | меньше 1 → `1` |
| `pageSize`| int      | `20` | 1…100, иначе клампится |

Пример:

```
GET /api/employees?search=ив&status=active&page=1&pageSize=20
```

Ответ:

```json
{
  "items": [
    {
      "id": 1,
      "firstName": "Александр",
      "middleName": "Владимирович",
      "lastName": "Иванов",
      "fullName": "Иванов Александр Владимирович",
      "birthDate": null,
      "hireDate": "2019-04-01T00:00:00",
      "dismissDate": null,
      "isActive": true,
      "createDate": "2019-05-20T10:58:02"
    }
  ],
  "total": 7,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1,
  "hasPrevious": false,
  "hasNext": false
}
```

Ошибки валидации возвращаются как `400` в стандартном формате `ValidationProblemDetails`
(ключи — имена полей). Отсутствующий `id` → `404`. В production необработанные
исключения отдаются как `500` в формате `application/problem+json`.

## Правила валидации

- `lastName`, `firstName`, `hireDate` — обязательные
- `middleName`, `birthDate`, `dismissDate` — необязательные (`null`)
- `dismissDate` не раньше `hireDate`
- `birthDate` не позже `hireDate` (дублируется ограничением в БД)
- максимальные длины соответствуют типу колонок

## Структура

```
db\01_schema_and_seed.sql                  таблица dbo.Employee (VARCHAR, как в ТЗ), индексы, CHECK, 7 записей
db\02_schema_and_seed_latin_nvarchar.sql   локальный тестовый вариант: NVARCHAR + SQL_Latin1_General_CP1_CI_AS
Employees\                                  только Web API
  Program.cs                                DI, EF Core, ProblemDetails для production
  appsettings.json                          строка подключения EmployeesDb
  Controllers\EmployeesApiController.cs     REST API
  Models\Employee.cs                        сущность (bdate -> HireDate, edate -> DismissDate)
  Models\Api\EmployeeContracts.cs           DTO, запросы, IValidatableObject
  Data\EmployeesDbContext.cs                контекст EF Core
  Data\EmployeeConfiguration.cs             маппинг Employee (IEntityTypeConfiguration)
  Services\EmployeeService.cs               поиск, фильтры, пагинация, CRUD
client\                                     Next.js 16 (App Router)
  next.config.ts                            прокси /api/* на API_ORIGIN
  src\app\layout.tsx                        метаданные, шрифт, стили
  src\app\page.tsx                          Server Component: выборка по URL, error-state
  src\app\globals.css                       Tailwind 4 (@import "tailwindcss") и базовые стили
  src\lib\types.ts                         типы, повторяющие контракт API
  src\lib\employee-query.ts                parse/build query string
  src\lib\api.ts                           fetch (серверный — абсолютный URL, клиентский — /api/*)
  src\lib\format.ts                        даты и склонения
  src\store\employees-store.ts              Zustand: модальные окна, формы, удаление
  src\components\employees\                таблица, фильтры, пагинация, модальные окна
  src\components\retry-button.tsx          повтор при недоступном API
```

## База данных

`dbo.Employee`: `id` (IDENTITY), `first_name`, `middle_name`, `last_name`, `birth_date`,
`bdate`, `edate`, `is_active`, `create_date`.

Индексы:

- `IX_Employee_Fio (last_name, first_name, middle_name) INCLUDE (birth_date, bdate, edate, is_active)`
- `IX_Employee_Edate (edate) INCLUDE (id, is_active)`

Ограничения: `PK_Employee`, `CK_Employee_Edate`, `CK_Employee_BirthDate`, default для
`is_active` и `create_date` (`SYSDATETIME()`).