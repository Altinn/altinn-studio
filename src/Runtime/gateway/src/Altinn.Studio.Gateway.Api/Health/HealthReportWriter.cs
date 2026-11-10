using System.Buffers;
using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Altinn.Studio.Gateway.Api.Health;

/// <summary>
/// Writes a health report in the format of
/// <see href="https://github.com/Altinn/altinn-aspnet-healthchecks">Altinn.AspNet.HealthChecks</see>, the
/// convention proposed for Altinn's products, at its minimal detail level:
/// <code>
/// {"status":"healthy","totalDuration":"00:00:00.0412000","entries":{"pdf3":{"status":"healthy","duration":"00:00:00.0070000"}}}
/// </code>
/// The endpoint is public, so a check's description, data and exception stay out of the body: they can hold
/// addresses and other internals. The platform team's uptime probe requires a body that starts with the status.
/// </summary>
internal static class HealthReportWriter
{
    public const string ContentType = "application/vnd.altinn.health.v1+json";

    public static async Task WriteAsync(HttpContext context, HealthReport report)
    {
        var response = context.Response;
        // Healthy and degraded both answer 200, as ASP.NET Core's health checks do.
        response.StatusCode =
            report.Status == HealthStatus.Unhealthy ? StatusCodes.Status503ServiceUnavailable : StatusCodes.Status200OK;
        response.ContentType = ContentType;
        response.Headers.CacheControl = "no-store";

        Write(response.BodyWriter, report);
        await response.BodyWriter.FlushAsync(context.RequestAborted);
    }

    internal static void Write(IBufferWriter<byte> buffer, HealthReport report)
    {
        using var writer = new Utf8JsonWriter(buffer);

        writer.WriteStartObject();
        writer.WriteString("status", ToJson(report.Status));
        writer.WriteString("totalDuration", ToJson(report.TotalDuration));
        writer.WriteStartObject("entries");
        foreach (var (name, entry) in report.Entries)
        {
            writer.WriteStartObject(name);
            writer.WriteString("status", ToJson(entry.Status));
            writer.WriteString("duration", ToJson(entry.Duration));
            writer.WriteEndObject();
        }
        writer.WriteEndObject();
        writer.WriteEndObject();
        writer.Flush();
    }

    private static string ToJson(HealthStatus status) =>
        status switch
        {
            HealthStatus.Healthy => "healthy",
            HealthStatus.Degraded => "degraded",
            _ => "unhealthy",
        };

    private static string ToJson(TimeSpan duration) => duration.ToString("c", CultureInfo.InvariantCulture);
}
