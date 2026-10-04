using Employees.Models.Api;
using Employees.Services;

namespace Employees.Models.ViewModels;

public sealed class EmployeesListViewModel
{
    public required PagedResult<EmployeeDto> Page { get; init; }

    public required string Search { get; init; }

    public required string Status { get; init; }
}