using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;
using WorkflowEngine.Core.Endpoints;

namespace WorkflowEngine.Core.Extensions;

/// <summary>
/// Top-level pipeline composition for the workflow engine. Hosts call <c>UseWorkflowEngine</c> on their
/// <see cref="WebApplication"/> to wire middleware, endpoints, and database migrations in a single step.
/// </summary>
public static class WorkflowEngineAppExtensions
{
    extension(WebApplication app)
    {
        /// <summary>
        /// Configures the middleware pipeline, maps all engine endpoints, and applies
        /// database migrations.
        /// <para>
        /// Call after <see cref="WorkflowEngineBuilderExtensions.AddWorkflowEngine"/>
        /// and after <c>builder.Build()</c>.
        /// </para>
        /// </summary>
        public async Task<WebApplication> UseWorkflowEngine()
        {
            // OpenAPI / SwaggerUI
            app.MapOpenApi();
            app.UseSwaggerUI(o => o.SwaggerEndpoint("/openapi/v1.json", "Workflow Engine API v1"));

            // Middleware
            app.UseExceptionHandler();

            // Endpoints
            app.MapHealthEndpoints();
            app.MapEngineEndpoints();

            // Dashboard
            app.MapDashboardUI();
            app.MapDashboardEndpoints();

            // Database lifecycle
            await app.ResetDatabaseConnectionsInDev();
            await app.ApplyDatabaseMigrations();

            // Runs before Kestrel binds, so the engine is never reachable while still cold. On a
            // freshly started engine the first enqueue cost ~195ms against ~6ms warm and the first
            // workflow took ~375ms to settle against ~48ms; warming the read paths here brings those
            // to ~160ms and ~270ms. The rest of the cold cost sits in the HTTP pipeline and the
            // enqueue write path, which a read-only warm-up cannot reach - see the method docs.
            await app.WarmUpEngine();

            return app;
        }
    }
}
