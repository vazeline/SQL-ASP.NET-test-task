-- Проверка скрипта 02_fill_OutboundPhones.sql.
-- Запускать в одном сеансе с реализацией, т.к. #Outbound - временная таблица:
--   sqlcmd -E -d CallListTest -i "sql\02_fill_OutboundPhones.sql,sql\test\03_verify_outbound_phones.sql"
SET NOCOUNT ON;
GO

PRINT '=== Содержимое #Outbound ===';
SELECT  NOwner,
        Phone01,
        Phone02,
        Phone03,
        Phone04,
        Phone05
FROM #Outbound
ORDER BY NOwner;
GO

DECLARE @Expected TABLE
(
    NOwner  INT          NOT NULL PRIMARY KEY,
    Phone01 NVARCHAR(16) NULL,
    Phone02 NVARCHAR(16) NULL,
    Phone03 NVARCHAR(16) NULL,
    Phone04 NVARCHAR(16) NULL,
    Phone05 NVARCHAR(16) NULL
);

INSERT INTO @Expected (NOwner, Phone01, Phone02, Phone03, Phone04, Phone05)
VALUES
    -- 6 номеров (4, 1, 3, 2, 5, 6) -> порядок по приоритету, шестой отброшен
    (1, N'+7(495)111-00-02', N'+7(495)111-00-04', N'+7(495)111-00-03', N'+7(495)111-00-01', N'+7(495)111-00-05'),
    -- приоритеты 2 и 5 без 1, 3, 4
    (2, N'+7(812)222-00-02', N'+7(812)222-00-05', NULL, NULL, NULL),
    -- единственный номер с приоритетом 3
    (3, N'+7(383)333-00-03', NULL, NULL, NULL, NULL),
    -- три номера с приоритетом 5 -> порядок по Id
    (4, N'+7(384)444-00-01', N'+7(384)444-00-02', N'+7(384)444-00-03', NULL, NULL),
    -- номеров нет
    (5, NULL, NULL, NULL, NULL, NULL),
    -- ровно 5 номеров
    (6, N'+7(863)666-00-01', N'+7(863)666-00-02', N'+7(863)666-00-03', N'+7(863)666-00-04', N'+7(863)666-00-05'),
    -- приоритет 0 приоритетнее 1, приоритета 1 нет
    (7, N'+7(861)777-00-00', N'+7(861)777-00-02', N'+7(861)777-00-03', N'+7(861)777-00-09', NULL),
    -- NULL в Priority сортируется раньше любого числа
    (8, N'+7(401)888-00-01', N'+7(401)888-00-02', NULL, NULL, NULL),
    (9, N'+7(487)999-00-01', N'+7(487)999-00-02', NULL, NULL, NULL);

;WITH ActualC AS
(
    SELECT NOwner,
           Phone01 = Phone01 COLLATE DATABASE_DEFAULT,
           Phone02 = Phone02 COLLATE DATABASE_DEFAULT,
           Phone03 = Phone03 COLLATE DATABASE_DEFAULT,
           Phone04 = Phone04 COLLATE DATABASE_DEFAULT,
           Phone05 = Phone05 COLLATE DATABASE_DEFAULT
    FROM #Outbound
),
ExpectedC AS
(
    SELECT NOwner,
           Phone01 = Phone01 COLLATE DATABASE_DEFAULT,
           Phone02 = Phone02 COLLATE DATABASE_DEFAULT,
           Phone03 = Phone03 COLLATE DATABASE_DEFAULT,
           Phone04 = Phone04 COLLATE DATABASE_DEFAULT,
           Phone05 = Phone05 COLLATE DATABASE_DEFAULT
    FROM @Expected
),
Diff AS
(
    (SELECT NOwner, Phone01, Phone02, Phone03, Phone04, Phone05 FROM ActualC
     EXCEPT
     SELECT NOwner, Phone01, Phone02, Phone03, Phone04, Phone05 FROM ExpectedC)
    UNION ALL
    (SELECT NOwner, Phone01, Phone02, Phone03, Phone04, Phone05 FROM ExpectedC
     EXCEPT
     SELECT NOwner, Phone01, Phone02, Phone03, Phone04, Phone05 FROM ActualC)
)
SELECT 'TEST 1' AS Test,
       CASE WHEN COUNT(*) = 0
            THEN 'PASS: #Outbound полностью совпал с ожидаемым'
            ELSE 'FAIL: расхождений ' + CONVERT(VARCHAR(10), COUNT(*))
       END AS Result
FROM Diff;
GO

SELECT 'TEST 2' AS Test,
       CASE WHEN COUNT(*) = 9
                 AND (SELECT COUNT(*) FROM dbo.CNT) = 9
            THEN 'PASS: строка на каждого контрагента из CNT, включая клиента без телефонов'
            ELSE 'FAIL: строк в #Outbound ' + CONVERT(VARCHAR(10), COUNT(*))
                 + ', в CNT ' + CONVERT(VARCHAR(10), (SELECT COUNT(*) FROM dbo.CNT))
       END AS Result
FROM #Outbound;
GO

SELECT 'TEST 3' AS Test,
       CASE WHEN Phone01 IS NULL AND Phone02 IS NULL AND Phone03 IS NULL
                 AND Phone04 IS NULL AND Phone05 IS NULL
            THEN 'PASS: у клиента 5 без телефонов все пять полей NULL'
            ELSE 'FAIL: у клиента 5 phones заполнены частично'
       END AS Result
FROM #Outbound
WHERE NOwner = 5;
GO

SELECT 'TEST 4' AS Test,
       'клиент ' + CONVERT(VARCHAR(10), NOwner) AS Client,
       CASE WHEN NOwner = 2
                 AND Phone01 = N'+7(812)222-00-02' AND Phone02 = N'+7(812)222-00-05'
                 AND Phone03 IS NULL AND Phone04 IS NULL AND Phone05 IS NULL
            THEN 'PASS: приоритеты 2 и 5 без 1, 3, 4 - порядок по приоритету'
            WHEN NOwner = 7
                 AND Phone01 = N'+7(861)777-00-00' AND Phone02 = N'+7(861)777-00-02'
                 AND Phone03 = N'+7(861)777-00-03' AND Phone04 = N'+7(861)777-00-09'
                 AND Phone05 IS NULL
            THEN 'PASS: приоритет 0 приоритетнее 1, приоритета 1 нет'
            ELSE 'FAIL: порядок не соответствует приоритетам'
       END AS Result
FROM #Outbound
WHERE NOwner IN (2, 7)
ORDER BY NOwner;
GO

SELECT 'TEST 5' AS Test,
       CASE WHEN Phone01 = N'+7(384)444-00-01' AND Phone02 = N'+7(384)444-00-02'
                 AND Phone03 = N'+7(384)444-00-03'
            THEN 'PASS: при одинаковом приоритете порядок по Id (клиент 4)'
            ELSE 'FAIL: при равных приоритетах порядок не по Id'
       END AS Result
FROM #Outbound
WHERE NOwner = 4;
GO

SELECT 'TEST 6' AS Test,
       CASE WHEN (SELECT COUNT(*) FROM dbo.Phones WHERE NOwner = 1) = 6
                 AND Phone05 = N'+7(495)111-00-05'
                 AND Phone05 <> N'+7(495)111-00-06'
            THEN 'PASS: номер с наихудшим приоритетом (6-й) отброшен'
            ELSE 'FAIL: лишние номера не отброшены или отброшен неверный'
       END AS Result
FROM #Outbound
WHERE NOwner = 1;
GO

SELECT 'TEST 7' AS Test,
       CASE WHEN (SELECT COUNT(*) FROM dbo.Phones WHERE Solid IS NULL) = 0
                 AND (SELECT COUNT(*) FROM #Outbound WHERE Phone01 IS NULL) = 1
            THEN 'PASS: NULL в Solid не возникает, пустые слоты только у клиентов без номеров'
            ELSE 'FAIL: неожиданные NULL в номерах'
       END AS Result;
GO