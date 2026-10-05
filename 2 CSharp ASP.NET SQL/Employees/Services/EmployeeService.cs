using Employees.Data;
using Employees.Models;
using Employees.Models.Api;
using Microsoft.EntityFrameworkCore;

namespace Employees.Services;

public sealed class EmployeeService(EmployeesDbContext db)
{
    public const int MaxPageSize = 100;

    public const int DefaultPageSize = 20;

    public async Task<PagedResult<EmployeeDto>> SearchAsync(EmployeeQuery q, CancellationToken ct)
    {
        var page = Math.Max(q.Page, 1);
        var pageSize = Math.Clamp(q.PageSize, 1, MaxPageSize);

        IQueryable<Employee> query = db.Employees.AsNoTracking();

        var search = q.Search?.Trim();
        if (!string.IsNullOrEmpty(search))
        {
            var pattern = $"%{EscapeLikePattern(search)}%";

            query = query.Where(e => EF.Functions.Like(e.LastName, pattern)
                                  || EF.Functions.Like(e.FirstName, pattern)
                                  || EF.Functions.Like(e.MiddleName!, pattern));
        }

        query = q.Status switch
        {
            EmployeeStatus.Active => query.Where(e => e.DismissDate == null),
            EmployeeStatus.Terminated => query.Where(e => e.DismissDate != null),
            _ => query
        };

        var total = await query.CountAsync(ct);

        var employees = await query
            .OrderBy(e => e.LastName)
            .ThenBy(e => e.FirstName)
            .ThenBy(e => e.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new PagedResult<EmployeeDto>(employees.Select(ToDto).ToList(), total, page, pageSize);
    }

    public async Task<EmployeeDto?> GetAsync(int id, CancellationToken ct)
    {
        var employee = await db.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id, ct);

        return employee is null ? null : ToDto(employee);
    }

    public async Task<EmployeeDto> CreateAsync(EmployeeWriteModel request, CancellationToken ct)
    {
        var employee = new Employee
        {
            FirstName = request.FirstName!.Trim(),
            MiddleName = Normalize(request.MiddleName),
            LastName = request.LastName!.Trim(),
            BirthDate = request.BirthDate,
            HireDate = request.HireDate!.Value,
            DismissDate = request.DismissDate,
            IsActive = request.IsActive
        };

        db.Employees.Add(employee);
        await db.SaveChangesAsync(ct);

        return ToDto(employee);
    }

    public async Task<EmployeeDto?> UpdateAsync(int id, EmployeeWriteModel request, CancellationToken ct)
    {
        var employee = await db.Employees.FirstOrDefaultAsync(e => e.Id == id, ct);
        if (employee is null)
        {
            return null;
        }

        employee.FirstName = request.FirstName!.Trim();
        employee.MiddleName = Normalize(request.MiddleName);
        employee.LastName = request.LastName!.Trim();
        employee.BirthDate = request.BirthDate;
        employee.HireDate = request.HireDate!.Value;
        employee.DismissDate = request.DismissDate;
        employee.IsActive = request.IsActive;

        await db.SaveChangesAsync(ct);

        return ToDto(employee);
    }

    public async Task<bool> DeleteAsync(int id, bool soft, CancellationToken ct)
    {
        var employee = await db.Employees.FirstOrDefaultAsync(e => e.Id == id, ct);
        if (employee is null)
        {
            return false;
        }

        if (soft)
        {
            employee.IsActive = false;
        }
        else
        {
            db.Employees.Remove(employee);
        }

        await db.SaveChangesAsync(ct);

        return true;
    }

    public static bool TryParseStatus(string? value, out EmployeeStatus status)
    {
        switch (value?.Trim().ToLowerInvariant())
        {
            case null:
            case "":
            case "all":
                status = EmployeeStatus.All;
                return true;

            case "active":
                status = EmployeeStatus.Active;
                return true;

            case "terminated":
                status = EmployeeStatus.Terminated;
                return true;

            default:
                status = EmployeeStatus.All;
                return false;
        }
    }

    public static EmployeeDto ToDto(Employee e) => new(
        e.Id,
        e.FirstName,
        e.MiddleName,
        e.LastName,
        e.FullName,
        e.BirthDate,
        e.HireDate,
        e.DismissDate,
        e.IsActive,
        e.CreateDate);

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string EscapeLikePattern(string value) => value
        .Replace("[", "[[]", StringComparison.Ordinal)
        .Replace("%", "[%]", StringComparison.Ordinal)
        .Replace("_", "[_]", StringComparison.Ordinal);
}