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

// Test-only command for observing state threading (incl. dependency state inheritance).
builder.Services.AddCommand<StateProbeCommand>();

var app = builder.Build();
await app.UseWorkflowEngine();
await app.RunAsync();

// Exposed for WebApplicationFactory<Program> in integration tests
public abstract partial class Program;
