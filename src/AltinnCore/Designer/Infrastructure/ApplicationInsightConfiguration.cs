using System;
using Microsoft.Extensions.DependencyInjection;

namespace AltinnCore.Designer.Infrastructure
{
    /// <summary>
    /// Contains extension methods for configuring application insight
    /// </summary>
    public static class ApplicationInsightConfiguration
    {
        /// <summary>
        /// Extension method that configures application insight
        /// </summary>
        /// <param name="services">The Microsoft.Extensions.DependencyInjection.IServiceCollection for adding services.</param>
        public static IServiceCollection ConfigureApplicationInsight(this IServiceCollection services)
        {
            string applicationInsightTelemetryKey = GetApplicationInsightsKeyFromEnvironment();
            if (!string.IsNullOrEmpty(applicationInsightTelemetryKey))
            {
                services.AddApplicationInsightsTelemetry(applicationInsightTelemetryKey);
                services.AddApplicationInsightsKubernetesEnricher();
            }

            return services;
        }

        /// <summary>
        ///  Gets telemetry instrumentation key from environment, which we set in Program.cs
        /// </summary>
        /// <returns>Telemetry instrumentation key</returns>
        private static string GetApplicationInsightsKeyFromEnvironment()
        {
            string evironmentKey = Environment.GetEnvironmentVariable("ApplicationInsights--InstrumentationKey");
            if (string.IsNullOrEmpty(evironmentKey))
            {
                return null;
            }

            return evironmentKey;
        }
    }
}
