using Employees.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Employees.Data;

public class EmployeeConfiguration : IEntityTypeConfiguration<Employee>
{
    public void Configure(EntityTypeBuilder<Employee> b)
    {
        b.ToTable("Employee");

        b.HasKey(e => e.Id);
        b.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();

        b.Property(e => e.FirstName).HasColumnName("first_name").IsRequired().HasMaxLength(50);
        b.Property(e => e.MiddleName).HasColumnName("middle_name").HasMaxLength(50);
        b.Property(e => e.LastName).HasColumnName("last_name").IsRequired().HasMaxLength(50);

        b.Property(e => e.BirthDate).HasColumnName("birth_date").HasColumnType("datetime");
        b.Property(e => e.HireDate).HasColumnName("bdate").HasColumnType("datetime");
        b.Property(e => e.DismissDate).HasColumnName("edate").HasColumnType("datetime");

        b.Property(e => e.IsActive).HasColumnName("is_active").HasDefaultValue(true);

        b.Property(e => e.CreateDate).HasColumnName("create_date").HasColumnType("datetime")
            .HasDefaultValueSql("SYSDATETIME()").ValueGeneratedOnAdd();

        b.Ignore(e => e.FullName);
    }
}