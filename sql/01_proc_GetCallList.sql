CREATE OR ALTER PROCEDURE dbo.usp_GetCallList
    @CalcDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Date DATE = ISNULL(@CalcDate, CONVERT(DATE, GETDATE()));

    DECLARE @FromDate DATETIME = DATEADD(MONTH, -6, @Date);

    DECLARE @ToDate DATETIME = DATEADD(DAY, 1, @Date);

    DECLARE @PeriodDays INT = DATEDIFF(DAY, @FromDate, @Date) + 1;

    IF OBJECT_ID(N'tempdb..#CallList') IS NOT NULL
        DROP TABLE #CallList;

    CREATE TABLE #CallList
    (
        NOwner             INT           NOT NULL,
        Owner              VARCHAR(50)  NULL,
        Company            VARCHAR(150) NULL,
        IsActive           BIT           NULL,
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
        DaysAfterLastOrder INT           NULL,
        CONSTRAINT PK_CallList PRIMARY KEY (NOwner)
    );

    WITH Orders AS
    (
        SELECT  d.Receive                                           AS NOwner,
                d.NDoc                                               AS NDoc,
                CONVERT(DATE, COALESCE(d.AccountDate, d.CreatDate))  AS OrderDate,
                SUM(CONVERT(FLOAT, ds.Qty) * it.Volume * CONVERT(FLOAT, op.sign)) AS Volume
        FROM dbo.DOC    AS d
        JOIN dbo.DOCSTR AS ds ON ds.NDoc = d.NDoc
        JOIN dbo.ITEM   AS it ON it.Item = ds.Item
        JOIN dbo.OPER   AS op ON op.Id   = ds.Oper
        WHERE d.IsShipped  = 1
          AND d.IsRegister = 1
          AND ds.Item IN (1, 4, 8)
          AND ds.Oper IN (1, 2)
          AND COALESCE(d.AccountDate, d.CreatDate) >= @FromDate
          AND COALESCE(d.AccountDate, d.CreatDate) <  @ToDate
          AND EXISTS (SELECT 1
                      FROM dbo.CNT AS c
                      WHERE c.NOwner = d.Receive
                        AND c.IsActive = 1)
        GROUP BY d.Receive, d.NDoc, CONVERT(DATE, COALESCE(d.AccountDate, d.CreatDate))
    ),
	ClientFirstOrderDates AS 
	(
		SELECT d.Receive  AS NOwner,
			   MIN(CONVERT(DATE, COALESCE(d.AccountDate, d.CreatDate)))  AS FirstOrderDate
		FROM dbo.DOC    AS d
		WHERE d.IsShipped  = 1 
			  AND d.IsRegister = 1
		GROUP BY d.Receive	  
	),
    ClientOrders AS
    (
        SELECT  o.NOwner,
                o.Volume AS PeriodVolume,
                FIRST_VALUE(o.OrderDate) OVER (PARTITION BY o.NOwner ORDER BY o.OrderDate DESC, o.NDoc DESC) AS LastOrderDate,
                FIRST_VALUE(o.Volume)    OVER (PARTITION BY o.NOwner ORDER BY o.OrderDate DESC, o.NDoc DESC) AS LastOrderVolume
        FROM Orders AS o
    ),
    ClientStat AS
    (
        SELECT  o.NOwner,
                MAX(o.LastOrderDate)      AS LastOrderDate,
                MAX(o.LastOrderVolume)    AS LastOrderVolume,
                SUM(o.PeriodVolume)       AS PeriodVolume
        FROM ClientOrders AS o
        GROUP BY o.NOwner
    ),
    ClientCalc AS
    (
        SELECT  s.NOwner,
                s.LastOrderDate,
                s.LastOrderVolume,
                s.PeriodVolume,
                AvgDayVolume = s.PeriodVolume / IIF(c.FirstOrderDate <= @FromDate, @PeriodDays, DATEDIFF(DAY, c.FirstOrderDate, @Date) + 1)
        FROM ClientStat AS s
			LEFT JOIN ClientFirstOrderDates AS c ON c.NOwner = s.NOwner
        WHERE s.PeriodVolume > 0
          AND s.LastOrderVolume > 0
    ),
    ExpectedCall AS
    (
        SELECT  x.NOwner,
                x.LastOrderDate,
                x.LastOrderVolume,
                x.PeriodVolume,
                AvgDayVolume = x.AvgDayVolume,
                q.Days    AS DaysAfterLastOrder,
                CallDate  = DATEADD(DAY, q.Days, x.LastOrderDate)
        FROM ClientCalc AS x
        CROSS APPLY (SELECT Days = CONVERT(INT, CEILING(x.LastOrderVolume / x.AvgDayVolume))) AS q
    )
    INSERT INTO #CallList
    (
        NOwner, Owner, Company, IsActive, PostalIndex, Region, City, Street, House, Flat, Floor,
        LastOrderDate, LastOrderVolume, PeriodVolume, PeriodDays, AvgDayVolume, DaysAfterLastOrder
    )
    SELECT  c.NOwner,
            c.Owner,
            c.Company,
            c.IsActive,
            c.PostalIndex,
            c.Region,
            c.City,
            c.Street,
            c.House,
            c.Flat,
            c.Floor,
            e.LastOrderDate,
            e.LastOrderVolume,
            e.PeriodVolume,
            @PeriodDays,
            e.AvgDayVolume,
            e.DaysAfterLastOrder
    FROM ExpectedCall AS e
    JOIN dbo.CNT AS c ON c.NOwner = e.NOwner
    WHERE e.CallDate = @Date;

    SELECT  NOwner,
            Owner,
            Company,
            PostalIndex,
            Region,
            City,
            Street,
            House,
            Flat,
            Floor,
            LastOrderDate,
            LastOrderVolume,
            PeriodVolume,
            PeriodDays,
            AvgDayVolume,
            DaysAfterLastOrder
    FROM #CallList
    ORDER BY Region, City, Owner;
END
GO