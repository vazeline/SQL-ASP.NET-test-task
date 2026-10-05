using Employees.Data;
using Employees.Services;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Проект — только Web API; UI живёт в client/ (Next.js) и ходит в API через
// собственный прокси, поэтому CORS-настройки не нужны.
builder.Services.AddControllers();

builder.Services.AddDbContext<EmployeesDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("EmployeesDb")));

builder.Services.AddScoped<EmployeeService>();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
    {
        var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;

        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/problem+json";

        await context.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Title = "Внутренняя ошибка сервера",
            Detail = app.Environment.IsDevelopment() ? exception?.Message : null,
        });
    }));

    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseRouting();

app.MapControllers();

app.Run();