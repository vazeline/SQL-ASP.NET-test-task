-- Сравнение двух реализаций заполнения #Outbound: PIVOT и условная агрегация MAX(CASE ...).
-- Данные объёма и вспомогательные процедуры создаются внутри транзакции и откатываются,
-- тестовая база не меняется.
--   sqlcmd -E -d CallListTest -i "sql\test\04_bench_outbound_phones.sql"
SET NOCOUNT ON;
SET STATISTICS IO OFF;
GO

IF OBJECT_ID(N'tempdb..#N') IS NOT NULL DROP TABLE #N;
IF OBJECT_ID(N'tempdb..#A') IS NOT NULL DROP TABLE #A;
IF OBJECT_ID(N'tempdb..#B') IS NOT NULL DROP TABLE #B;
GO

CREATE TABLE #A (NOwner INT NOT NULL PRIMARY KEY, Phone01 NVARCHAR(16) NULL, Phone02 NVARCHAR(16) NULL, Phone03 NVARCHAR(16) NULL, Phone04 NVARCHAR(16) NULL, Phone05 NVARCHAR(16) NULL);
CREATE TABLE #B (NOwner INT NOT NULL PRIMARY KEY, Phone01 NVARCHAR(16) NULL, Phone02 NVARCHAR(16) NULL, Phone03 NVARCHAR(16) NULL, Phone04 NVARCHAR(16) NULL, Phone05 NVARCHAR(16) NULL);
GO

BEGIN TRAN;

SELECT TOP (50000) n = ROW_NUMBER() OVER (ORDER BY (SELECT NULL))
INTO #N
FROM sys.all_objects AS a
CROSS JOIN sys.all_objects AS b;

INSERT INTO dbo.CNT (NOwner, Owner, Company, IsActive, PostalIndex, Region, City, Street, House, Flat, Floor)
SELECT  100000 + n,
        CONVERT(VARCHAR(50),  CONCAT(N'клиент-', n)),
        CONVERT(VARCHAR(150), CONCAT(N'ООО-',     n)),
        1, '101000', N'Москва', N'Москва', N'Тверская', N'1', N'10', 1
FROM #N;

-- у каждого десятого номеров нет вовсе, у каждого десятого - 4 номера, у остальных - 7 (проверка отсечения после 5-го)
INSERT INTO dbo.Phones (Id, NOwner, CodeCity, Phone, Type, Comment, Priority, Solid)
SELECT  Id       = 1000000 + n * 10 + k,
        NOwner   = 100000 + n,
        CodeCity = 495,
        Phone    = CONVERT(VARCHAR(10), 1000000 + n * 10 + k),
        Type     = k % 2,
        Comment  = NULL,
        Priority = ((n * 3 + k) % 5) + 1,
        Solid    = CONVERT(NVARCHAR(16), CONCAT('+7(495)', 1000000 + n * 10 + k))
FROM #N
CROSS JOIN (VALUES (1), (2), (3), (4), (5), (6), (7)) AS v (k)
WHERE n % 10 <> 3
  AND (n % 10 <> 7 OR k <= 4);
GO

SELECT  Clients = (SELECT COUNT(*) FROM dbo.CNT),
        Phones  = (SELECT COUNT(*) FROM dbo.Phones),
        NoPhone = (SELECT COUNT(*) FROM dbo.CNT AS c WHERE NOT EXISTS (SELECT 1 FROM dbo.Phones AS p WHERE p.NOwner = c.NOwner)),
        Over5   = (SELECT COUNT(*) FROM (SELECT NOwner FROM dbo.Phones GROUP BY NOwner HAVING COUNT(*) > 5) AS x);
GO

CREATE PROCEDURE dbo.bench_FillCase
AS
BEGIN
    SET NOCOUNT ON;

    TRUNCATE TABLE #A;

    WITH RankedPhones AS
    (
        SELECT  p.NOwner,
                p.Solid,
                rn = ROW_NUMBER() OVER (PARTITION BY p.NOwner ORDER BY p.Priority, p.Id)
        FROM dbo.Phones AS p
    )
    INSERT INTO #A (NOwner, Phone01, Phone02, Phone03, Phone04, Phone05)
    SELECT  c.NOwner,
            Phone01 = MAX(CASE WHEN r.rn = 1 THEN r.Solid END),
            Phone02 = MAX(CASE WHEN r.rn = 2 THEN r.Solid END),
            Phone03 = MAX(CASE WHEN r.rn = 3 THEN r.Solid END),
            Phone04 = MAX(CASE WHEN r.rn = 4 THEN r.Solid END),
            Phone05 = MAX(CASE WHEN r.rn = 5 THEN r.Solid END)
    FROM dbo.CNT AS c
    LEFT JOIN RankedPhones AS r ON r.NOwner = c.NOwner
    GROUP BY c.NOwner;
END;
GO

CREATE PROCEDURE dbo.bench_FillPivot
AS
BEGIN
    SET NOCOUNT ON;

    TRUNCATE TABLE #B;

    WITH RankedPhones AS
    (
        SELECT  p.NOwner,
                p.Solid,
                rn = ROW_NUMBER() OVER (PARTITION BY p.NOwner ORDER BY p.Priority, p.Id)
        FROM dbo.Phones AS p
    ),
    Top5 AS
    (
        SELECT NOwner, Solid, rn
        FROM RankedPhones
        WHERE rn <= 5
    )
    INSERT INTO #B (NOwner, Phone01, Phone02, Phone03, Phone04, Phone05)
    SELECT  c.NOwner,
            p.[1],
            p.[2],
            p.[3],
            p.[4],
            p.[5]
    FROM dbo.CNT AS c
    LEFT JOIN
    (
        SELECT  NOwner,
                [1],
                [2],
                [3],
                [4],
                [5]
        FROM Top5
        PIVOT (MAX(Solid) FOR rn IN ([1], [2], [3], [4], [5])) AS pv
    ) AS p ON p.NOwner = c.NOwner;
END;
GO

EXEC dbo.bench_FillCase;
EXEC dbo.bench_FillPivot;
GO

;WITH Diff AS
(
    (SELECT NOwner, Phone01, Phone02, Phone03, Phone04, Phone05 FROM #A
     EXCEPT
     SELECT NOwner, Phone01, Phone02, Phone03, Phone04, Phone05 FROM #B)
    UNION ALL
    (SELECT NOwner, Phone01, Phone02, Phone03, Phone04, Phone05 FROM #B
     EXCEPT
     SELECT NOwner, Phone01, Phone02, Phone03, Phone04, Phone05 FROM #A)
)
SELECT 'EQUIVALENCE' AS Test,
       CASE WHEN COUNT(*) = 0
            THEN 'PASS: на полном объёме PIVOT и MAX(CASE) совпадают'
            ELSE 'FAIL: расхождений ' + CONVERT(VARCHAR(10), COUNT(*))
       END AS Result
FROM Diff;
GO

DECLARE @t DATETIME2 = SYSDATETIME();
EXEC dbo.bench_FillCase;
SELECT 'A run 1' AS Run, ElapsedMs = DATEDIFF(MILLISECOND, @t, SYSDATETIME());

SET @t = SYSDATETIME();
EXEC dbo.bench_FillPivot;
SELECT 'B run 1' AS Run, ElapsedMs = DATEDIFF(MILLISECOND, @t, SYSDATETIME());

SET @t = SYSDATETIME();
EXEC dbo.bench_FillCase;
SELECT 'A run 2' AS Run, ElapsedMs = DATEDIFF(MILLISECOND, @t, SYSDATETIME());

SET @t = SYSDATETIME();
EXEC dbo.bench_FillPivot;
SELECT 'B run 2' AS Run, ElapsedMs = DATEDIFF(MILLISECOND, @t, SYSDATETIME());

SET @t = SYSDATETIME();
EXEC dbo.bench_FillCase;
SELECT 'A run 3' AS Run, ElapsedMs = DATEDIFF(MILLISECOND, @t, SYSDATETIME());

SET @t = SYSDATETIME();
EXEC dbo.bench_FillPivot;
SELECT 'B run 3' AS Run, ElapsedMs = DATEDIFF(MILLISECOND, @t, SYSDATETIME());

SET @t = SYSDATETIME();
EXEC dbo.bench_FillCase;
SELECT 'A run 4' AS Run, ElapsedMs = DATEDIFF(MILLISECOND, @t, SYSDATETIME());

SET @t = SYSDATETIME();
EXEC dbo.bench_FillPivot;
SELECT 'B run 4' AS Run, ElapsedMs = DATEDIFF(MILLISECOND, @t, SYSDATETIME());
GO

PRINT '--- логические чтения: A (MAX CASE) ---';
SET STATISTICS IO ON;
GO

EXEC dbo.bench_FillCase;
GO

PRINT '--- логические чтения: B (PIVOT) ---';
GO

EXEC dbo.bench_FillPivot;
GO

SET STATISTICS IO OFF;
GO

ROLLBACK;
GO