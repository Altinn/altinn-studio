using WorkflowEngine.Api.Extensions;
using WorkflowEngine.Models.Exceptions;

var builder = WebApplication.CreateBuilder(args);

var connectionString =
    builder.Configuration.GetConnectionString("WorkflowEngine")
    ?? throw new EngineConfigurationException(
        "Database connection string 'WorkflowEngine' is required, but has not been configured."
    );

builder.AddWorkflowEngine(connectionString);

var app = builder.Build();
await app.UseWorkflowEngine();
await app.RunAsync();

// Exposed for WebApplicationFactory<Program> in integration tests
public partial class Program;
