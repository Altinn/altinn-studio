using Microsoft.ApplicationInsights.Channel;
using Microsoft.ApplicationInsights.Extensibility;

namespace Altinn.Studio.Designer.Configuration
{
    /// <summary>
    /// Set up custom telemetry for Application Insights
    /// </summary>
    public class CustomTelemetryInitializer : ITelemetryInitializer
    {
        /// <summary>
        /// Custom TelemetryInitializer that sets some specific values for the component
        /// </summary>
        public void Initialize(ITelemetry telemetry)
        {
            if (string.IsNullOrEmpty(telemetry.Context.Cloud.RoleName))
            {
                telemetry.Context.Cloud.RoleName = "studio-designer";
            }
        }
    }
}
