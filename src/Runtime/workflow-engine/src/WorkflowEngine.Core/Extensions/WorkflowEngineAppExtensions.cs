using WorkflowEngine.Core.Endpoints;

namespace WorkflowEngine.Core.Extensions;

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
            if (!app.Environment.IsDevelopment())
                app.UseHttpsRedirection();

            // Endpoints
            app.MapHealthEndpoints();
            app.MapEngineEndpoints();

            // Dashboard (non-production only)
            if (!app.Environment.IsProduction())
            {
                app.UseCors("Dashboard");
                app.MapDashboardEndpoints();
            }

            // Database lifecycle
            await app.ResetDatabaseConnectionsInDev();
            await app.ApplyDatabaseMigrations();

            return app;
        }
    }
}
