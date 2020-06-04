using System;
using Microsoft.ApplicationInsights.Channel;
using Microsoft.ApplicationInsights.Extensibility;

namespace Altinn.App.PlatformServices.Extensions
{
    /// <summary>
    /// Set up custom telemetry for Application Insights
    /// </summary>
    public class CustomTelemetryInitializer : ITelemetryInitializer
    {
        public void Initialize(ITelemetry telemetry)
        {
            if (string.IsNullOrEmpty(telemetry.Context.Cloud.RoleName))
            {
                string roleName = Environment.GetEnvironmentVariable("AppSettings__AppInsightsRoleName");
                telemetry.Context.Cloud.RoleName = roleName;
            }
        }
    }
}
