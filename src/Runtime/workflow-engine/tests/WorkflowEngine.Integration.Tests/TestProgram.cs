using Altinn.Studio.Runtime.Common;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using WorkflowEngine.Api.Authentication.ApiKey;
using WorkflowEngine.Api.Endpoints;
using WorkflowEngine.Api.Extensions;
using WorkflowEngine.CommandHandlers.Handlers.Webhook;
using WorkflowEngine.Data.Extensions;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// Minimal host that composes the engine from Core's public API.
/// Used by <c>WebApplicationFactory&lt;Program&gt;</c> in integration tests.
/// </summary>
public class Program
{
    public static async Task Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        bool isDev = builder.Environment.IsDevelopment();

        // Hosting config
        builder.UseCommonHostingConfiguration();
        builder.UseProblemDetailsForBadRequests();
        builder.UseCaseInsensitiveCamelCaseJson();

        builder.Configuration.AddEnvironmentVariables();

        // Services
        builder.Services.AddCors(options =>
        {
            options.AddPolicy(
                "Dashboard",
                policy =>
                {
                    var origins =
                        builder.Configuration.GetSection("CorsSettings:AllowedOrigins").Get<string[]>()
                        ?? ["http://localhost:8090"];
                    policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod();
                }
            );
        });
        builder.Services.AddWorkflowEngineHost();
        builder.Services.AddApiKeyAuthentication();
        builder.Services.AddTelemetry(emitQueryParameters: isDev);
        builder.Services.AddDbRepository(enableSensitiveDataLogging: isDev);
        builder.Services.AddEngineHealthChecks();
        builder.Services.AddHttpContextAccessor();
        builder.Services.AddOpenApi(options => options.AddDocumentTransformer<ApiKeyOpenApiTransformer>());
        builder.Services.AddCommand<WebhookCommandDescriptor>();

        var app = builder.Build();

        var dbConnectionString =
            app.Configuration.GetConnectionString("WorkflowEngine")
            ?? throw new EngineConfigurationException(
                "Database connection string 'WorkflowEngine' is required, but has not been configured."
            );

        // Reset stale database connections in development
        await app.ResetDatabaseConnectionsInDev(dbConnectionString);

        // Apply database migrations
        await app.ApplyDatabaseMigrations(dbConnectionString);

        // OpenAPI
        app.MapOpenApi();
        app.UseSwaggerUI(options =>
        {
            options.SwaggerEndpoint("/openapi/v1.json", "Workflow Engine API v1");
        });

        // Middleware
        app.UseExceptionHandler();
        if (!isDev)
            app.UseHttpsRedirection();

        // Endpoints
        app.MapHealthEndpoints();
        app.MapEngineEndpoints();
        if (!app.Environment.IsProduction())
        {
            app.UseCors("Dashboard");
            app.MapDashboardEndpoints();
        }

        await app.RunAsync();
    }
}
