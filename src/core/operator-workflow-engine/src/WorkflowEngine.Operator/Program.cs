using Altinn.Studio.Common;
using Microsoft.Extensions.DependencyInjection.Extensions;
using WorkflowEngine.Core.Extensions;
using WorkflowEngine.Models.Abstractions;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.Operator.Commands.OperatorCommand;
using WorkflowEngine.Operator.Extensions;

var builder = WebApplication.CreateBuilder(args);

if (builder.Environment.IsDevelopment())
{
    builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);
}
builder.Configuration.AddEnvironmentVariables();

var connectionString =
    builder.Configuration.GetConnectionString("WorkflowEngine")
    ?? throw new EngineConfigurationException(
        "Database connection string 'WorkflowEngine' is required, but has not been configured."
    );

builder.AddWorkflowEngine(connectionString);
builder.Services.AddGracefulShutdown(
    builder.Environment,
    endpointDrainDelay: TimeSpan.FromSeconds(5),
    applicationShutdownTimeout: TimeSpan.FromSeconds(35)
);

builder.Services.ConfigureOperatorCommand();

// AddWorkflowEngine also registers the library's built-in commands, and the core operator ADR gives this host one.
builder.Services.RemoveAll<ICommand>();
builder.Services.AddCommand<OperatorCommand>();

var app = builder.Build();
await app.UseWorkflowEngine();
await app.RunAsync();
