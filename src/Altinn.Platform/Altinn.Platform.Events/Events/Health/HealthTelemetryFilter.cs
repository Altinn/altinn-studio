using System.Diagnostics.CodeAnalysis;
using Microsoft.ApplicationInsights.Channel;
using Microsoft.ApplicationInsights.DataContracts;
using Microsoft.ApplicationInsights.Extensibility;

namespace Altinn.Platform.Events.Health
{
    /// <summary>
    /// Filter to exclude health check request from Application Insights
    /// </summary>
    [ExcludeFromCodeCoverage]
    public class HealthTelemetryFilter : ITelemetryProcessor
    {
        private ITelemetryProcessor Next { get; set; }

        /// <summary>
        /// Initializes a new instance of the <see cref="HealthTelemetryFilter"/> class.
        /// </summary>
        public HealthTelemetryFilter(ITelemetryProcessor next)
        {
            Next = next;
        }

        /// <inheritdoc/>
        public void Process(ITelemetry item)
        {
            if (ExcludeItemTelemetry(item))
            {
                return;
            }

            Next.Process(item);
        }

        private bool ExcludeItemTelemetry(ITelemetry item)
        {
            RequestTelemetry request = item as RequestTelemetry;

            if (request != null && request.Url.ToString().EndsWith("/health/"))
            {
                return true;
            }

            return false;
        }
    }
}
