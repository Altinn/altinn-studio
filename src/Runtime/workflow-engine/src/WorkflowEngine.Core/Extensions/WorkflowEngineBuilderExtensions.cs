using Altinn.Studio.Runtime.Common;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using WorkflowEngine.Api.Authentication.ApiKey;
using WorkflowEngine.Data.Extensions;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Api.Extensions;

/// <summary>
/// Options controlling which optional features are registered by
/// <see cref="WorkflowEngineBuilderExtensions.AddWorkflowEngine"/>.
/// All features are enabled by default.
/// </summary>
public sealed class WorkflowEngineOptions
{
    /// <summary>
    /// Register OpenTelemetry tracing, metrics and logging.
    /// Default: <c>true</c>.
    /// </summary>
    public bool EnableTelemetry { get; set; } = true;

    /// <summary>
    /// Emit EF Core query parameters in telemetry output.
    /// Default: <c>null</c> (follows <c>IsDevelopment()</c>).
    /// </summary>
    public bool? EmitQueryParameters { get; set; }

    /// <summary>
    /// Enable EF Core sensitive data logging.
    /// Default: <c>null</c> (follows <c>IsDevelopment()</c>).
    /// </summary>
    public bool? EnableSensitiveDataLogging { get; set; }

    /// <summary>
    /// Register OpenAPI document generation and SwaggerUI.
    /// Default: <c>true</c>.
    /// </summary>
    public bool EnableOpenApi { get; set; } = true;

    /// <summary>
    /// Register the CORS "Dashboard" policy.
    /// Default: <c>true</c>.
    /// </summary>
    public bool EnableDashboardCors { get; set; } = true;

    /// <summary>
    /// Map dashboard endpoints (SSE, query, scheduled, step details) in non-production.
    /// Default: <c>true</c>.
    /// </summary>
    public bool EnableDashboard { get; set; } = true;
}

public static class WorkflowEngineBuilderExtensions
{
    extension(WebApplicationBuilder builder)
    {
        /// <summary>
        /// Registers all core workflow engine services on the builder, including hosting
        /// configuration, authentication, database, health checks, and the built-in
        /// <c>WebhookCommand</c>.
        /// <para>
        /// Optional features (telemetry, OpenAPI, dashboard CORS) can be toggled via
        /// <paramref name="configure"/>. All are enabled by default.
        /// </para>
        /// <para>
        /// After calling this, hosts typically only need to register app-specific commands
        /// via <c>AddCommand&lt;T&gt;()</c>.
        /// </para>
        /// </summary>
        public WebApplicationBuilder AddWorkflowEngine(Action<WorkflowEngineOptions>? configure = null)
        {
            var options = new WorkflowEngineOptions();
            configure?.Invoke(options);
            bool isDev = builder.Environment.IsDevelopment();

            // Hosting fundamentals (from Altinn.Studio.Runtime.Common)
            builder.UseCommonHostingConfiguration();
            builder.UseProblemDetailsForBadRequests();
            builder.UseCaseInsensitiveCamelCaseJson();
            builder.Configuration.AddEnvironmentVariables();

            // Core engine services (includes WebhookCommand)
            builder.Services.AddWorkflowEngineHost();
            builder.Services.AddApiKeyAuthentication();
            builder.Services.AddDbRepository(enableSensitiveDataLogging: options.EnableSensitiveDataLogging ?? isDev);
            builder.Services.AddEngineHealthChecks();
            builder.Services.AddHttpContextAccessor();

            // Optional: telemetry
            if (options.EnableTelemetry)
                builder.Services.AddTelemetry(emitQueryParameters: options.EmitQueryParameters ?? isDev);

            // Optional: OpenAPI
            if (options.EnableOpenApi)
                builder.Services.AddOpenApi(o => o.AddDocumentTransformer<ApiKeyOpenApiTransformer>());

            // Optional: Dashboard CORS
            if (options.EnableDashboardCors)
            {
                builder.Services.AddCors(cors =>
                {
                    cors.AddPolicy(
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
            }

            return builder;
        }
    }
}
