using Microsoft.ApplicationInsights.Channel;
using Microsoft.ApplicationInsights.Extensibility;

namespace Altinn.Platform.Events.Functions
{
    /// <summary>
    /// Class that handles initialization of App Insights telemetry.
    /// </summary>
    public class TelemetryInitializer : ITelemetryInitializer
    {
        /// <summary>
        /// Initializer.
        /// </summary>
        /// <param name="telemetry">The telemetry.</param>
        public void Initialize(ITelemetry telemetry)
        {
            // set custom role name here
            telemetry.Context.Cloud.RoleName = "events-function";
        }
    }
}
