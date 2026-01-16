using WorkflowEngine.Api.Authentication;
using WorkflowEngine.Api.Endpoints;
using WorkflowEngine.Api.Extensions;
using WorkflowEngine.Data.Extensions;
using WorkflowEngine.Models.Exceptions;

var builder = WebApplication.CreateBuilder(args);
var dbConnectionString =
    builder.Configuration.GetConnectionString("WorkflowEngine")
    ?? throw new EngineConfigurationException(
        "Database connection string 'WorkflowEngine' is required, but has not been configured."
    );

// Services
builder.Services.AddWorkflowEngineHost();
builder.Services.AddOpenApi();
builder.Services.AddApiKeyAuthentication();
builder.Services.AddDbRepository(dbConnectionString);
builder.Services.AddEngineHealthChecks();

var app = builder.Build();

// Apply database migrations
await app.MigrateDatabaseAsync(dbConnectionString);

// Middleware
app.MapOpenApi();
app.UseSwaggerUI(options => options.SwaggerEndpoint("/openapi/v1.json", "Workflow Engine API v1"));

//
// app.UseSwaggerUI(options =>
// {
//     options.SwaggerEndpoint("/openapi/public-v1.json", "Public API v1");
//     options.SwaggerEndpoint("/openapi/internal-v1.json", "Internal API v1");
// });

if (!builder.Environment.IsDevelopment())
    app.UseHttpsRedirection();

// Endpoints
app.MapHealthEndpoints();

var summaries = new[]
{
    "Freezing",
    "Bracing",
    "Chilly",
    "Cool",
    "Mild",
    "Warm",
    "Balmy",
    "Hot",
    "Sweltering",
    "Scorching",
};

app.MapGet(
        "/weatherforecast",
        () =>
        {
            var forecast = Enumerable
                .Range(1, 5)
                .Select(index => new WeatherForecast(
                    DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
                    Random.Shared.Next(-20, 55),
                    summaries[Random.Shared.Next(summaries.Length)]
                ))
                .ToArray();
            return forecast;
        }
    )
    .WithName("GetWeatherForecast")
    .RequireAuthorization(ApiKeyAuthenticationHandler.PolicyName);

await app.RunAsync();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
