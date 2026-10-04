using System.ComponentModel.DataAnnotations;

namespace Employees.Models.Api;

public enum EmployeeStatus
{
    All,
    Active,
    Terminated
}

public sealed record EmployeeDto(
    int Id,
    string FirstName,
    string? MiddleName,
    string LastName,
    string FullName,
    DateTime? BirthDate,
    DateTime HireDate,
    DateTime? DismissDate,
    bool IsActive,
    DateTime CreateDate);

public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize)
{
    public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling(Total / (double)PageSize);

    public bool HasPrevious => Page > 1;

    public bool HasNext => Page < TotalPages;
}

public abstract class EmployeeWriteModel : IValidatableObject
{
    [Required(ErrorMessage = "Укажите имя")]
    [StringLength(50, ErrorMessage = "Имя не длиннее 50 символов")]
    public string? FirstName { get; set; }

    [StringLength(50, ErrorMessage = "Отчество не длиннее 50 символов")]
    public string? MiddleName { get; set; }

    [Required(ErrorMessage = "Укажите фамилию")]
    [StringLength(50, ErrorMessage = "Фамилия не длиннее 50 символов")]
    public string? LastName { get; set; }

    public DateTime? BirthDate { get; set; }

    [Required(ErrorMessage = "Укажите дату трудоустройства")]
    public DateTime? HireDate { get; set; }

    public DateTime? DismissDate { get; set; }

    public bool IsActive { get; set; } = true;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (HireDate.HasValue && DismissDate.HasValue && DismissDate.Value < HireDate.Value)
        {
            yield return new ValidationResult(
                "Дата увольнения не может быть раньше даты трудоустройства",
                [nameof(DismissDate)]);
        }

        if (HireDate.HasValue && BirthDate.HasValue && BirthDate.Value > HireDate.Value)
        {
            yield return new ValidationResult(
                "Дата рождения не может быть позже даты трудоустройства",
                [nameof(BirthDate)]);
        }
    }
}

public sealed class CreateEmployeeRequest : EmployeeWriteModel;

public sealed class UpdateEmployeeRequest : EmployeeWriteModel;

public sealed record EmployeeQuery(string? Search, EmployeeStatus Status, int Page = 1, int PageSize = 20);