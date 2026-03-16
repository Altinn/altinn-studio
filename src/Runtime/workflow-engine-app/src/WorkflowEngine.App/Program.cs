using WorkflowEngine.App.Commands.AppCommand;
using WorkflowEngine.App.Extensions;
using WorkflowEngine.Core.Extensions;
using WorkflowEngine.Models.Exceptions;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

var connectionString =
    builder.Configuration.GetConnectionString("WorkflowEngine")
    ?? throw new EngineConfigurationException(
        "Database connection string 'WorkflowEngine' is required, but has not been configured."
    );

builder.AddWorkflowEngine(connectionString);

// App-specific commands
builder.Services.ConfigureAppCommand();
builder.Services.AddCommand<AppCommand>();

var app = builder.Build();
await app.UseWorkflowEngine();
await app.RunAsync();

// Exposed for WebApplicationFactory<Program> in integration tests
public partial class Program;
