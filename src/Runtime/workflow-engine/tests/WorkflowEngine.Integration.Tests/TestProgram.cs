using Altinn.Studio.Runtime.Common;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using WorkflowEngine.Api.Authentication.ApiKey;
using WorkflowEngine.Api.Endpoints;
using WorkflowEngine.Api.Extensions;
using WorkflowEngine.Commands.Webhook;
using WorkflowEngine.Data.Extensions;
using WorkflowEngine.Telemetry.Extensions;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// Minimal host that composes the engine from Core's public API.
/// Used by <c>WebApplicationFactory&lt;Program&gt;</c> in integration tests.
/// <para>
/// Note: This class intentionally does not define a <c>Main</c> entry point.
/// xUnit v3 generates its own entry point, and <see cref="EngineWebApplicationFactory{TProgram}"/>
/// overrides <c>CreateHost</c> to build the application directly via
/// <see cref="CreateBuilder"/> and <see cref="ConfigureApp"/>.
/// </para>
/// </summary>
public class Program : ITestProgram
{
    private Program() { }

    /// <summary>
    /// Creates and configures a <see cref="WebApplicationBuilder"/> with all engine services registered.
    /// </summary>
    public static WebApplicationBuilder CreateBuilder(string[] args)
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
                        builder.Configuration.GetSection("CorsSettings:AllowedOrigins").Get<string[]>() ??
                        [
                            "http://localhost:8090",
                        ];
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
        builder.Services.AddCommand<WebhookCommand>();

        return builder;
    }

    /// <summary>
    /// Configures middleware and endpoints on a built <see cref="WebApplication"/>.
    /// </summary>
    public static void ConfigureApp(WebApplication app)
    {
        // OpenAPI
        app.MapOpenApi();
        app.UseSwaggerUI(options =>
        {
            options.SwaggerEndpoint("/openapi/v1.json", "Workflow Engine API v1");
        });

        // Middleware
        app.UseExceptionHandler();
        if (!app.Environment.IsDevelopment())
            app.UseHttpsRedirection();

        // Endpoints
        app.MapHealthEndpoints();
        app.MapEngineEndpoints();
        if (!app.Environment.IsProduction())
        {
            app.UseCors("Dashboard");
            app.MapDashboardEndpoints();
        }
    }
}
