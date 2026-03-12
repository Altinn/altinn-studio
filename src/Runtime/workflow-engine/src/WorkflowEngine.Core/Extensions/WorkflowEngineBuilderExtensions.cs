using Altinn.Studio.Runtime.Common;
using WorkflowEngine.Commands.Webhook;
using WorkflowEngine.Core.Authentication.ApiKey;
using WorkflowEngine.Data.Extensions;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Core.Extensions;

/// <summary>
/// Holds the database connection string provided by the host at startup.
/// Registered as a singleton by <see cref="WorkflowEngineBuilderExtensions.AddWorkflowEngine"/>
/// and consumed by database services at resolution time.
/// </summary>
public sealed record EngineConnectionString(string Value);

public static class WorkflowEngineBuilderExtensions
{
    extension(WebApplicationBuilder builder)
    {
        /// <summary>
        /// Registers all core workflow engine services on the builder, including hosting
        /// configuration, authentication, database, health checks, telemetry, OpenAPI,
        /// dashboard CORS, and the built-in <c>WebhookCommand</c>.
        /// <para>
        /// The <paramref name="connectionString"/> is stored as a singleton and consumed
        /// by all database services (repository, migrations, connection reset).
        /// </para>
        /// <para>
        /// After calling this, hosts typically only need to register app-specific commands
        /// via <c>AddCommand&lt;T&gt;()</c>.
        /// </para>
        /// </summary>
        public WebApplicationBuilder AddWorkflowEngine(string connectionString)
        {
            builder.Services.AddSingleton(new EngineConnectionString(connectionString));
            bool isDev = builder.Environment.IsDevelopment();

            // Hosting fundamentals (from Altinn.Studio.Runtime.Common)
            builder.UseCommonHostingConfiguration();
            builder.UseProblemDetailsForBadRequests();
            builder.UseCaseInsensitiveCamelCaseJson();
            builder.Configuration.AddEnvironmentVariables();

            // Core engine services
            builder.Services.AddWorkflowEngineHost();
            builder.Services.AddApiKeyAuthentication();
            builder.Services.AddDbRepository(
                sp => sp.GetRequiredService<EngineConnectionString>().Value,
                enableSensitiveDataLogging: isDev
            );
            builder.Services.AddEngineHealthChecks();
            builder.Services.AddHttpContextAccessor();

            // Built-in commands
            builder.Services.AddCommand<WebhookCommand>();

            // Telemetry
            builder.Services.AddTelemetry(emitQueryParameters: isDev);

            // OpenAPI
            builder.Services.AddOpenApi(o => o.AddDocumentTransformer<ApiKeyOpenApiTransformer>());

            // Dashboard CORS
            builder.Services.AddCors(cors =>
            {
                cors.AddPolicy(
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

            return builder;
        }
    }
}
