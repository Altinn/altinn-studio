#nullable disable
using System.Diagnostics.CodeAnalysis;
using Microsoft.ApplicationInsights.Channel;
using Microsoft.ApplicationInsights.DataContracts;
using Microsoft.ApplicationInsights.Extensibility;

namespace Altinn.App.Api.Infrastructure.Telemetry;

/// <summary>
/// Filter to exclude health check request from Application Insights
/// </summary>
[ExcludeFromCodeCoverage]
public class HealthTelemetryFilter : ITelemetryProcessor
{
    private ITelemetryProcessor _next { get; set; }

    /// <summary>
    /// Initializes a new instance of the <see cref="HealthTelemetryFilter"/> class.
    /// </summary>
    public HealthTelemetryFilter(ITelemetryProcessor next)
    {
        _next = next;
    }

    /// <inheritdoc/>
    public void Process(ITelemetry item)
    {
        if (ExcludeItemTelemetry(item))
        {
            return;
        }

        _next.Process(item);
    }

    private static bool ExcludeItemTelemetry(ITelemetry item)
    {
        RequestTelemetry request = item as RequestTelemetry;

        if (request != null && request.Url.ToString().EndsWith("/health", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return false;
    }
}
