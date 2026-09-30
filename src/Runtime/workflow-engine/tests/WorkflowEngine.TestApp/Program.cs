using WorkflowEngine.Core.Extensions;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.TestApp;

var builder = WebApplication.CreateBuilder(args);

var connectionString =
    builder.Configuration.GetConnectionString("WorkflowEngine")
    ?? throw new EngineConfigurationException(
        "Database connection string 'WorkflowEngine' is required, but has not been configured."
    );

builder.AddWorkflowEngine(connectionString);

// Test-only commands live in the shared host so integration tests exercising them can use the shared
// fixture instead of booting a second PostgreSQL container. They are inert unless a step names them.
builder.Services.AddCommand<DeferringCommand>();
builder.Services.AddCommand<ReceivingCommand>();

var app = builder.Build();
await app.UseWorkflowEngine();
await app.RunAsync();

// Exposed for WebApplicationFactory<Program> in integration tests
public abstract partial class Program;
