using WorkflowEngine.Api.Authentication.ApiKey;
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
builder.Services.AddOpenApi(options => options.AddDocumentTransformer<ApiKeyOpenApiTransformer>());
builder.Services.AddApiKeyAuthentication();
builder.Services.AddDbRepository(dbConnectionString);
builder.Services.AddEngineHealthChecks();

var app = builder.Build();

// Apply database migrations
await app.MigrateDatabaseAsync(dbConnectionString);

// OpenAPI
app.MapOpenApi();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/openapi/v1.json", "Workflow Engine API v1");
});

// Middleware
if (!builder.Environment.IsDevelopment())
    app.UseHttpsRedirection();

// Endpoints
app.MapHealthEndpoints();
app.MapEngineEndpoints();

await app.RunAsync();
