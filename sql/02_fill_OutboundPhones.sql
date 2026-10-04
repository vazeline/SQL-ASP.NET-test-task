SET NOCOUNT ON;
GO

IF OBJECT_ID(N'tempdb..#Outbound') IS NOT NULL
    DROP TABLE #Outbound;
GO

CREATE TABLE #Outbound
(
    NOwner  INT          NOT NULL PRIMARY KEY,
    Phone01 NVARCHAR(16) NULL,
    Phone02 NVARCHAR(16) NULL,
    Phone03 NVARCHAR(16) NULL,
    Phone04 NVARCHAR(16) NULL,
    Phone05 NVARCHAR(16) NULL
);
GO

WITH RankedPhones AS
(
    SELECT  p.NOwner,
            p.Solid,
            rn = ROW_NUMBER() OVER (PARTITION BY p.NOwner
                                    ORDER BY p.Priority, p.Id)
    FROM dbo.Phones AS p
),
Top5 AS
(
    SELECT NOwner,
           Solid,
           rn
    FROM RankedPhones
    WHERE rn <= 5
)
INSERT INTO #Outbound (NOwner, Phone01, Phone02, Phone03, Phone04, Phone05)
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
GO

SELECT  NOwner,
        Phone01,
        Phone02,
        Phone03,
        Phone04,
        Phone05
FROM #Outbound
ORDER BY NOwner;
GO