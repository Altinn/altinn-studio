using Altinn.Studio.Runtime.Common;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using WorkflowEngine.Commands.Webhook;
using WorkflowEngine.Core.Constants;
using WorkflowEngine.Core.Metadata;
using WorkflowEngine.Data.Extensions;
using WorkflowEngine.Models;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Core.Extensions;

public static class WorkflowEngineBuilderExtensions
{
    extension(WebApplicationBuilder builder)
    {
        /// <summary>
        /// Registers all core workflow engine services on the builder, including hosting
        /// configuration, database, health checks, telemetry, OpenAPI,
        /// and the built-in <c>WebhookCommand</c>.
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
            builder.Services.AddDbRepository(enableSensitiveDataLogging: isDev);
            builder.Services.AddEngineHealthChecks();
            builder.Services.AddHttpContextAccessor();

            // Built-in commands
            builder.Services.AddCommand<WebhookCommand>();

            // Telemetry (can be disabled via EngineSettings:EnableTelemetry = false)
            bool enableTelemetry = builder.Configuration.GetValue(
                $"EngineSettings:{nameof(EngineSettings.EnableTelemetry)}",
                defaultValue: Defaults.EngineSettings.EnableTelemetry
            );
            if (enableTelemetry)
                builder.Services.AddTelemetry(emitQueryParameters: isDev);

            // OpenAPI
            builder.Services.AddOpenApi(options =>
            {
                options.AddOperationTransformer<WorkflowMetadataOperationTransformer>();
            });

            return builder;
        }
    }
}
