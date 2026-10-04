using Employees.Models;
using Microsoft.EntityFrameworkCore;

namespace Employees.Data;

public class EmployeesDbContext : DbContext
{
    public EmployeesDbContext(DbContextOptions<EmployeesDbContext> options)
        : base(options)
    {
    }

    public DbSet<Employee> Employees => Set<Employee>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new EmployeeConfiguration());
        base.OnModelCreating(modelBuilder);
    }
}