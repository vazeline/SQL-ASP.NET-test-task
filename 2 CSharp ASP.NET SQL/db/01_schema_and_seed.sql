SET NOCOUNT ON;
GO

IF DB_ID(N'EmployeesDb') IS NULL
    CREATE DATABASE EmployeesDb;
GO

USE EmployeesDb;
GO

IF OBJECT_ID(N'dbo.Employee', N'U') IS NOT NULL
    DROP TABLE dbo.Employee;
GO

CREATE TABLE dbo.Employee
(
    id          INT          IDENTITY(1, 1) NOT NULL,
    first_name  VARCHAR(50)  NOT NULL,
    middle_name VARCHAR(50)  NULL,
    last_name   VARCHAR(50)  NOT NULL,
    birth_date  DATETIME     NULL,
    bdate       DATETIME     NOT NULL,
    edate       DATETIME     NULL,
    is_active   BIT          NOT NULL CONSTRAINT DF_Employee_IsActive   DEFAULT (1),
    create_date DATETIME     NOT NULL CONSTRAINT DF_Employee_CreateDate DEFAULT (SYSDATETIME()),
    CONSTRAINT PK_Employee            PRIMARY KEY (id),
    CONSTRAINT CK_Employee_Edate      CHECK (edate IS NULL OR edate >= bdate),
    CONSTRAINT CK_Employee_BirthDate  CHECK (birth_date IS NULL OR birth_date <= bdate)
);
GO

-- Список сортируется по фамилии, поэтому фамилия впереди; ФИО покрыт для поиска по подстроке.
CREATE INDEX IX_Employee_Fio ON dbo.Employee (last_name, first_name, middle_name)
    INCLUDE (birth_date, bdate, edate, is_active);
GO

CREATE INDEX IX_Employee_Edate ON dbo.Employee (edate) INCLUDE (id, is_active);
GO

INSERT INTO dbo.Employee (first_name, middle_name, last_name, birth_date, bdate, edate, is_active, create_date)
VALUES
    (N'Александр', N'Владимирович', N'Иванов',     NULL,         '20190401', NULL,        1, '20190520 10:58:02'),
    (N'Елена',      NULL,            N'Булдакова',  '19900515',   '20180426', '20190519', 1, '20190519 11:00:31'),
    (N'Владимир',   NULL,            N'Вожовк',     NULL,         '20190506', NULL,        1, '20190520 10:51:15'),
    (N'Андрей',     NULL,            N'Данилов',    NULL,         '20190424', NULL,        1, '20190520 09:05:04'),
    (N'Роман',      NULL,            N'Добревский', NULL,         '20190424', NULL,        1, '20190520 10:51:00'),
    (N'Владимир',   NULL,            N'Лисничук',   NULL,         '20190424', NULL,        0, '20190520 10:30:32'),
    (N'Алексей',    NULL,            N'Литвинов',   NULL,         '20190513', NULL,        1, '20190520 08:15:51');
GO