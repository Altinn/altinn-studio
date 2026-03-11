using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;
using WorkflowEngine.Api.Endpoints;

namespace WorkflowEngine.Api.Extensions;

public static class WorkflowEngineAppExtensions
{
    extension(WebApplication app)
    {
        /// <summary>
        /// Configures the middleware pipeline and maps all engine endpoints.
        /// <para>
        /// Call after <see cref="WorkflowEngineBuilderExtensions.AddWorkflowEngine"/>
        /// and after <c>builder.Build()</c>.
        /// </para>
        /// </summary>
        public WebApplication UseWorkflowEngine(Action<WorkflowEngineOptions>? configure = null)
        {
            var options = new WorkflowEngineOptions();
            configure?.Invoke(options);

            // OpenAPI / SwaggerUI
            if (options.EnableOpenApi)
            {
                app.MapOpenApi();
                app.UseSwaggerUI(o => o.SwaggerEndpoint("/openapi/v1.json", "Workflow Engine API v1"));
            }

            // Middleware
            app.UseExceptionHandler();
            if (!app.Environment.IsDevelopment())
                app.UseHttpsRedirection();

            // Endpoints
            app.MapHealthEndpoints();
            app.MapEngineEndpoints();

            // Dashboard (non-production only)
            if (options.EnableDashboard && !app.Environment.IsProduction())
            {
                if (options.EnableDashboardCors)
                    app.UseCors("Dashboard");
                app.MapDashboardEndpoints();
            }

            return app;
        }
    }
}
