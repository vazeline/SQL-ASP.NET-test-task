namespace Employees.Models;

public class Employee
{
    public int Id { get; set; }

    public string FirstName { get; set; } = string.Empty;

    public string? MiddleName { get; set; }

    public string LastName { get; set; } = string.Empty;

    public DateTime? BirthDate { get; set; }

    public DateTime HireDate { get; set; }

    public DateTime? DismissDate { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreateDate { get; set; }

    public string FullName => string.Join(
        " ",
        new[] { LastName, FirstName, MiddleName }.Where(p => !string.IsNullOrWhiteSpace(p)));
}