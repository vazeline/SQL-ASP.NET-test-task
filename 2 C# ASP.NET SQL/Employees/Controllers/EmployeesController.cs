using Employees.Models.Api;
using Employees.Models.ViewModels;
using Employees.Services;
using Microsoft.AspNetCore.Mvc;

namespace Employees.Controllers;

public sealed class EmployeesController(EmployeeService service) : Controller
{
    [HttpGet]
    public async Task<IActionResult> Index(
        string? search,
        string? status,
        int page = 1,
        int pageSize = EmployeeService.DefaultPageSize,
        CancellationToken ct = default)
    {
        if (!EmployeeService.TryParseStatus(status, out var parsedStatus))
        {
            parsedStatus = EmployeeStatus.All;
        }

        var result = await service.SearchAsync(new EmployeeQuery(search, parsedStatus, page, pageSize), ct);

        var model = new EmployeesListViewModel
        {
            Page = result,
            Search = search ?? string.Empty,
            Status = status?.Trim().ToLowerInvariant() ?? "all"
        };

        return View(model);
    }
}