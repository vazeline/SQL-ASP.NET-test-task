# Справочник сотрудников — ASP.NET Core MVC + EF Core + MS SQL Server

Небольшое приложение: список сотрудников с поиском, фильтром по статусу, серверной
пагинацией, добавлением и редактированием через модальное окно.

- Backend: REST API `/api/employees`
- Frontend: Razor Pages/MVC + Bootstrap 5, запросы к API через `fetch` (`wwwroot/js/employees.js`)
- Хранилище: MS SQL Server, доступ через EF Core (`Microsoft.EntityFrameworkCore.SqlServer 9.0.9`)
- Миграции не используются: схему и начальные данные создаёт SQL-скрипт

## Требования

- .NET 9 SDK (проект `net9.0`; собирается и запускается на .NET 9)
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

3. Запустить приложение:

   ```powershell
   dotnet run --project Employees
   ```

4. Открыть `https://localhost:<порт>/employees` (или `/` — редирект на список).

> **Важно про кодировку.** По ТЗ текстовые колонки — `VARCHAR`, поэтому база должна
> использовать коллацию, поддерживающую кириллицу (`Russian_CI_AS` и т. п.). На сервере
> с латинской коллацией (`SQL_Latin1_General_CP1_CI_AS`) литералы `N'Иванов'` приведут к
> `??????`. Для таких случаев есть локальный тестовый скрипт с `NVARCHAR`
> (`db\02_schema_and_seed_latin_nvarchar.sql`); рабочий вариант по ТЗ —
> `db\01_schema_and_seed.sql`.

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
(ключи — имена полей). Отсутствующий `id` → `404`.

## Правила валидации

- `lastName`, `firstName`, `hireDate` — обязательные
- `middleName`, `birthDate`, `dismissDate` — необязательные (`null`)
- `dismissDate` не раньше `hireDate`
- `birthDate` не позже `hireDate` (дублируется ограничением в БД)
- максимальные длины соответствуют типу колонок

## Структура

```
db\01_schema_and_seed.sql             таблица dbo.Employee (VARCHAR, как в ТЗ), индексы, CHECK, 7 записей
db\02_schema_and_seed_latin_nvarchar.sql  локальный тестовый вариант: NVARCHAR + SQL_Latin1_General_CP1_CI_AS
Employees\
  Program.cs                   DI, EF Core, маршрутизация
  appsettings.json             строка подключения EmployeesDb
  Controllers\EmployeesApiController.cs   REST API
  Controllers\EmployeesController.cs      MVC-страница списка
  Models\Employee.cs                     сущность (bdate -> HireDate, edate -> DismissDate)
  Models\Api\EmployeeContracts.cs        DTO, запросы, IValidatableObject
  Models\ViewModels\EmployeesListViewModel.cs
  Data\EmployeesDbContext.cs              контекст EF Core
  Data\EmployeeConfiguration.cs          маппинг Employee (IEntityTypeConfiguration)
  Services\EmployeeService.cs            поиск, фильтры, пагинация, CRUD
  Views\Employees\Index.cshtml           таблица, фильтры, модальное окно
  wwwroot\js\employees.js                работа с API и модальным окном
```

## База данных

`dbo.Employee`: `id` (IDENTITY), `first_name`, `middle_name`, `last_name`, `birth_date`,
`bdate`, `edate`, `is_active`, `create_date`.

Индексы:

- `IX_Employee_Fio (last_name, first_name, middle_name) INCLUDE (birth_date, bdate, edate, is_active)`
- `IX_Employee_Edate (edate) INCLUDE (id, is_active)`

Ограничения: `PK_Employee`, `CK_Employee_Edate`, `CK_Employee_BirthDate`,default для
`is_active` и `create_date` (`SYSDATETIME()`).