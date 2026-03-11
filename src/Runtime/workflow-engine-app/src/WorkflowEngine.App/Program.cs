using WorkflowEngine.Api.Extensions;
using WorkflowEngine.App.Commands.AppCommand;
using WorkflowEngine.App.Extensions;
using WorkflowEngine.Models.Exceptions;

var builder = WebApplication.CreateBuilder(args);
builder.AddWorkflowEngine();
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// App-specific commands
builder.Services.ConfigureAppCommand();
builder.Services.AddCommand<AppCommand>();

var app = builder.Build();

var dbConnectionString =
    app.Configuration.GetConnectionString("WorkflowEngine")
    ?? throw new EngineConfigurationException(
        "Database connection string 'WorkflowEngine' is required, but has not been configured."
    );

// Reset stale database connections in development (e.g. from ungraceful shutdowns during load testing)
await app.ResetDatabaseConnectionsInDev(dbConnectionString);

// Apply database migrations
await app.ApplyDatabaseMigrations(dbConnectionString);

app.UseWorkflowEngine();
await app.RunAsync();

// Exposed for WebApplicationFactory<Program> in integration tests
public partial class Program;
