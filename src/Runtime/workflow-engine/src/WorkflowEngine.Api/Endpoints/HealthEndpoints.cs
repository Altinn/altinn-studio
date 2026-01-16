using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace WorkflowEngine.Api.Endpoints;

internal static class HealthEndpoints
{
    public static WebApplication MapHealthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/v1/health").WithTags("Health checks").ExcludeFromDescription();

        // Liveness probe - always returns 200 if the process is running
        group.MapGet("/live", () => Results.Ok(new { status = "alive" }));

        // Readiness probe - checks if the engine is ready to accept work
        group.MapHealthChecks(
            "/ready",
            new HealthCheckOptions
            {
                Predicate = check => check.Tags.Contains("ready"),
                ResponseWriter = HealthResponseJsonWriter,
            }
        );

        // Aggregate health endpoint - runs all registered health checks
        group.MapHealthChecks("", new HealthCheckOptions { ResponseWriter = HealthResponseJsonWriter });

        return app;
    }

    private static async Task HealthResponseJsonWriter(HttpContext context, HealthReport report)
    {
        context.Response.ContentType = "application/json";

        var response = new
        {
            status = report.Status.ToString(),
            checks = report.Entries.Select(entry => new
            {
                name = entry.Key,
                status = entry.Value.Status.ToString(),
                description = entry.Value.Description,
                data = entry.Value.Data,
            }),
        };

        await context.Response.WriteAsJsonAsync(response);
    }
}
