using Altinn.Studio.Runtime.Common;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
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

// Hosting config
builder.UseCommonHostingConfiguration();
builder.UseProblemDetailsForBadRequests();
builder.UseCaseInsensitiveCamelCaseJson();

// Services
builder.Services.AddWorkflowEngineHost();
builder.Services.AddTelemetry();
builder.Services.AddOpenApi(options => options.AddDocumentTransformer<ApiKeyOpenApiTransformer>());
builder.Services.AddApiKeyAuthentication();
builder.Services.AddDbRepository(dbConnectionString, enableSensitiveDataLogging: builder.Environment.IsDevelopment());
builder.Services.AddEngineHealthChecks();
builder.Services.AddHttpContextAccessor();

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
app.UseExceptionHandler();
if (!builder.Environment.IsDevelopment())
    app.UseHttpsRedirection();

// Endpoints
app.MapHealthEndpoints();
app.MapEngineEndpoints();

await app.RunAsync();
