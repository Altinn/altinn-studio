using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Hosting;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Altinn.Platform.Storage.DataCleanup
{
    /// <summary>
    /// The data cleanup startup
    /// </summary>
    public class Startup : IWebJobsStartup
    {
        /// <summary>
        /// Gets data cleanup project configuration
        /// </summary>
        public void Configure(IWebJobsBuilder builder)
        {
            builder.Services.TryAddSingleton<ITelemetryInitializer, TelemetryInitializer>();
        }
    }
}
