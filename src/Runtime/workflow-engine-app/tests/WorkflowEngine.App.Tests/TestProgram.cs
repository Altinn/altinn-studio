using Altinn.Studio.Runtime.Common;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using WorkflowEngine.Api.Authentication.ApiKey;
using WorkflowEngine.Api.Endpoints;
using WorkflowEngine.Api.Extensions;
using WorkflowEngine.App.Commands.AppCommand;
using WorkflowEngine.App.Extensions;
using WorkflowEngine.Commands.Webhook;
using WorkflowEngine.Data.Extensions;
using WorkflowEngine.Telemetry.Extensions;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.App.Tests;

/// <summary>
/// Test host that composes the engine with both WebhookCommand and AppCommand.
/// Mirrors the real Program.cs but implements <see cref="ITestProgram"/> for the TestKit.
/// </summary>
public class Program : ITestProgram
{
    private Program() { }

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
                        builder
                            .Configuration.GetSection("CorsSettings:AllowedOrigins")
                            .Get<string[]>()
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
        builder.Services.AddOpenApi(options =>
            options.AddDocumentTransformer<ApiKeyOpenApiTransformer>()
        );

        // Register commands.
        // WebhookCommand is not in the real Program.cs but is registered here so that
        // tests can also exercise generic webhook steps alongside AppCommand.
        builder.Services.AddCommand<WebhookCommand>();
        builder.Services.ConfigureAppCommand();
        builder.Services.AddCommand<AppCommand>();

        return builder;
    }

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
