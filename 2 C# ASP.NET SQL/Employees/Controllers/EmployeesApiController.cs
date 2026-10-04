using Employees.Models.Api;
using Employees.Services;
using Microsoft.AspNetCore.Mvc;

namespace Employees.Controllers;

[ApiController]
[Route("api/employees")]
[Produces("application/json")]
public sealed class EmployeesApiController(EmployeeService service) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<PagedResult<EmployeeDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResult<EmployeeDto>>> Search(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = EmployeeService.DefaultPageSize,
        CancellationToken ct = default)
    {
        if (!EmployeeService.TryParseStatus(status, out var parsedStatus))
        {
            return BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]>
            {
                ["status"] = [$"Допустимые значения: all, active, terminated (получено: \"{status}\")"]
            }));
        }

        var result = await service.SearchAsync(
            new EmployeeQuery(search, parsedStatus, page, pageSize),
            ct);

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType<EmployeeDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EmployeeDto>> Get(int id, CancellationToken ct)
    {
        var employee = await service.GetAsync(id, ct);

        return employee is null ? NotFound() : Ok(employee);
    }

    [HttpPost]
    [ProducesResponseType<EmployeeDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<EmployeeDto>> Create(
        [FromBody] CreateEmployeeRequest request,
        CancellationToken ct)
    {
        var created = await service.CreateAsync(request, ct);

        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType<EmployeeDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EmployeeDto>> Update(
        int id,
        [FromBody] UpdateEmployeeRequest request,
        CancellationToken ct)
    {
        var updated = await service.UpdateAsync(id, request, ct);

        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(
        int id,
        [FromQuery] bool soft = false,
        CancellationToken ct = default)
    {
        var removed = await service.DeleteAsync(id, soft, ct);

        return removed ? NoContent() : NotFound();
    }
}