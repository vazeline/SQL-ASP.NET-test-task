SET NOCOUNT ON;
GO

USE CallListTest;
GO

IF OBJECT_ID(N'tempdb..#Actual') IS NOT NULL DROP TABLE #Actual;
GO

CREATE TABLE #Actual
(
    NOwner             INT           NOT NULL,
    Owner              VARCHAR(50)  NULL,
    Company            VARCHAR(150) NULL,
    PostalIndex        VARCHAR(12)  NULL,
    Region             VARCHAR(50)  NULL,
    City               VARCHAR(24)  NULL,
    Street             VARCHAR(64)  NULL,
    House              VARCHAR(10)  NULL,
    Flat               VARCHAR(25)  NULL,
    Floor              SMALLINT      NULL,
    LastOrderDate      DATE          NULL,
    LastOrderVolume    FLOAT         NULL,
    PeriodVolume       FLOAT         NULL,
    PeriodDays         INT           NULL,
    AvgDayVolume       FLOAT         NULL,
    DaysAfterLastOrder INT           NULL
);
GO

IF OBJECT_ID(N'tempdb..#Actual2') IS NOT NULL DROP TABLE #Actual2;
GO
SELECT TOP 0 * INTO #Actual2 FROM #Actual;
GO

-- Расчётная дата 2026-10-03, окно заказов 2026-04-03 .. 2026-10-03 (184 дня).
-- Период клиента считается от его первого заказа, если тот позже 2026-04-03.
PRINT '=== 2026-10-03: клиенты 1 и 4 ===';
INSERT #Actual EXEC dbo.usp_GetCallList @CalcDate = '20261003';
SELECT  NOwner,
		Owner,
		Company,
        LastOrderDate,
        LastOrderVolume,
        PeriodVolume,
        PeriodDays,
        AvgDayVolume = ROUND(AvgDayVolume, 4),
        DaysAfterLastOrder,
        EffectiveDays = CONVERT(INT, ROUND(PeriodVolume / AvgDayVolume, 0))
FROM #Actual;
GO

DECLARE @Expected TABLE
(
    NOwner             INT   NOT NULL PRIMARY KEY,
    LastOrderDate      DATE  NOT NULL,
    LastOrderVolume    FLOAT NOT NULL,
    PeriodVolume       FLOAT NOT NULL,
    PeriodDays         INT   NOT NULL,
    AvgDayVolume       FLOAT NOT NULL,
    DaysAfterLastOrder INT   NOT NULL,
    EffectiveDays      INT   NOT NULL
);

-- Клиент 1: период от 2026-09-11 = 23 дня (не 184), 114 / 23 = 4.9565, последний заказ 38 л -> 8 дней.
-- Клиент 4: период от 2026-09-01 = 33 дня, 95 / 33 = 2.8788, последний заказ 19 л (2 - 1 возврат) -> 7 дней.
-- Колонка PeriodDays содержит фактический делитель клиента, EffectiveDays - независимая проверка PeriodVolume / AvgDayVolume.
INSERT INTO @Expected (NOwner, LastOrderDate, LastOrderVolume, PeriodVolume, PeriodDays, AvgDayVolume, DaysAfterLastOrder, EffectiveDays)
VALUES
    (1, '20260925', 38, 114, 23, 4.9565, 8, 23),
    (4, '20260926', 19,  95, 33, 2.8788, 7, 33);

;WITH Diff AS
(
    (SELECT NOwner, LastOrderDate, LastOrderVolume, PeriodVolume, PeriodDays,
            AvgDayVolume = ROUND(AvgDayVolume, 4), DaysAfterLastOrder,
            EffectiveDays = CONVERT(INT, ROUND(PeriodVolume / AvgDayVolume, 0))
     FROM #Actual
     EXCEPT
     SELECT NOwner, LastOrderDate, LastOrderVolume, PeriodVolume, PeriodDays, AvgDayVolume, DaysAfterLastOrder, EffectiveDays
     FROM @Expected)
    UNION ALL
    (SELECT NOwner, LastOrderDate, LastOrderVolume, PeriodVolume, PeriodDays, AvgDayVolume, DaysAfterLastOrder, EffectiveDays
     FROM @Expected
     EXCEPT
     SELECT NOwner, LastOrderDate, LastOrderVolume, PeriodVolume, PeriodDays,
            AvgDayVolume = ROUND(AvgDayVolume, 4), DaysAfterLastOrder,
            EffectiveDays = CONVERT(INT, ROUND(PeriodVolume / AvgDayVolume, 0))
     FROM #Actual)
)
SELECT 'TEST 1' AS Test,
       CASE WHEN COUNT(*) = 0
            THEN 'PASS: на 2026-10-03 клиенты 1 и 4; период каждого посчитан от первого заказа (23 и 33 дня, а не 184)'
            ELSE 'FAIL: расхождений ' + CONVERT(VARCHAR(10), COUNT(*))
       END AS Result
FROM Diff;

SELECT 'TEST 2' AS Test,
       CASE WHEN COUNT(*) = 0
            THEN 'PASS: исключены 2 (заказы до окна), 3 (неверная операция/товар), 5 (IsActive=0), 6 (не доставлен), 8 (звонок 2026-10-09), 9 (только возвраты)'
            ELSE 'FAIL: в списке ' + CONVERT(VARCHAR(10), COUNT(*)) + ' лишних клиентов'
       END AS Result
FROM #Actual
WHERE NOwner IN (2, 3, 5, 6, 8, 9);
GO

TRUNCATE TABLE #Actual;
GO

PRINT '=== 2026-10-06: клиент 7 (период от первого заказа 2026-08-15 = 50 дней) ===';
INSERT #Actual EXEC dbo.usp_GetCallList @CalcDate = '20261006';
SELECT * FROM #Actual;

SELECT 'TEST 3' AS Test,
       CASE WHEN COUNT(*) = 1 AND MIN(NOwner) = 7
            THEN 'PASS: на 2026-10-06 в списке только клиент 7'
            ELSE 'FAIL: в списке ' + CONVERT(VARCHAR(10), COUNT(*)) + ' строк(и)'
       END AS Result
FROM #Actual;
GO

TRUNCATE TABLE #Actual;
GO

PRINT '=== 2026-10-09: клиент 8 (первый заказ до окна -> полный период 184 дня) ===';
INSERT #Actual EXEC dbo.usp_GetCallList @CalcDate = '20261009';
SELECT NOwner, LastOrderDate, LastOrderVolume, PeriodVolume, PeriodDays, AvgDayVolume = ROUND(AvgDayVolume, 4),
       DaysAfterLastOrder, EffectiveDays = CONVERT(INT, ROUND(PeriodVolume / AvgDayVolume, 0))
FROM #Actual;

SELECT 'TEST 4' AS Test,
       CASE WHEN COUNT(*) = 1 AND MIN(NOwner) = 8
             AND MIN(PeriodDays) = 184
             AND MIN(CONVERT(INT, ROUND(PeriodVolume / AvgDayVolume, 0))) = 184
            THEN 'PASS: на 2026-10-09 только клиент 8, период 184 дня (первый заказ раньше окна)'
            ELSE 'FAIL: в списке ' + CONVERT(VARCHAR(10), COUNT(*)) + ' строк(и)'
       END AS Result
FROM #Actual;
GO

TRUNCATE TABLE #Actual;
GO

PRINT '=== 2026-10-05: пусто ===';
INSERT #Actual EXEC dbo.usp_GetCallList @CalcDate = '20261005';

SELECT 'TEST 5' AS Test,
       CASE WHEN COUNT(*) = 0
            THEN 'PASS: на 2026-10-05 список пуст'
            ELSE 'FAIL: в списке ' + CONVERT(VARCHAR(10), COUNT(*)) + ' строк(и)'
       END AS Result
FROM #Actual;
GO

TRUNCATE TABLE #Actual;
GO

PRINT '=== Параметр по умолчанию (@CalcDate = NULL -> текущая дата) ===';
DECLARE @Today DATE = CONVERT(DATE, GETDATE());
INSERT #Actual  EXEC dbo.usp_GetCallList;
INSERT #Actual2 EXEC dbo.usp_GetCallList @CalcDate = @Today;

;WITH Diff AS
(
    (SELECT NOwner, Owner, LastOrderDate, LastOrderVolume, PeriodVolume, PeriodDays, AvgDayVolume, DaysAfterLastOrder FROM #Actual
     EXCEPT
     SELECT NOwner, Owner, LastOrderDate, LastOrderVolume, PeriodVolume, PeriodDays, AvgDayVolume, DaysAfterLastOrder FROM #Actual2)
    UNION ALL
    (SELECT NOwner, Owner, LastOrderDate, LastOrderVolume, PeriodVolume, PeriodDays, AvgDayVolume, DaysAfterLastOrder FROM #Actual2
     EXCEPT
     SELECT NOwner, Owner, LastOrderDate, LastOrderVolume, PeriodVolume, PeriodDays, AvgDayVolume, DaysAfterLastOrder FROM #Actual)
)
SELECT 'TEST 6' AS Test,
       CASE WHEN COUNT(*) = 0
            THEN 'PASS: NULL и явно переданная текущая дата дают одинаковый результат (сегодня ' + CONVERT(VARCHAR(10), GETDATE(), 23) + ')'
            ELSE 'FAIL: результаты различаются'
       END AS Result
FROM Diff;
GO

TRUNCATE TABLE #Actual;
TRUNCATE TABLE #Actual2;
GO

PRINT '=== Стабильность при повторном вызове ===';
INSERT #Actual  EXEC dbo.usp_GetCallList @CalcDate = '20261003';
INSERT #Actual2 EXEC dbo.usp_GetCallList @CalcDate = '20261003';

;WITH Diff AS
(
    (SELECT NOwner, Owner, LastOrderDate, LastOrderVolume, PeriodVolume, PeriodDays, AvgDayVolume, DaysAfterLastOrder FROM #Actual
     EXCEPT
     SELECT NOwner, Owner, LastOrderDate, LastOrderVolume, PeriodVolume, PeriodDays, AvgDayVolume, DaysAfterLastOrder FROM #Actual2)
    UNION ALL
    (SELECT NOwner, Owner, LastOrderDate, LastOrderVolume, PeriodVolume, PeriodDays, AvgDayVolume, DaysAfterLastOrder FROM #Actual2
     EXCEPT
     SELECT NOwner, Owner, LastOrderDate, LastOrderVolume, PeriodVolume, PeriodDays, AvgDayVolume, DaysAfterLastOrder FROM #Actual)
)
SELECT 'TEST 7' AS Test,
       CASE WHEN COUNT(*) = 0
             AND (SELECT COUNT(*) FROM #Actual) = (SELECT COUNT(DISTINCT NOwner) FROM #Actual)
             AND (SELECT COUNT(*) FROM #Actual) = 2
            THEN 'PASS: повторный вызов даёт тот же результат, дублей нет'
            ELSE 'FAIL: расхождений ' + CONVERT(VARCHAR(10), COUNT(*)) + ', строк ' + CONVERT(VARCHAR(10), (SELECT COUNT(*) FROM #Actual))
       END AS Result
FROM Diff;
GO