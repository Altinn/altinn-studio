using Altinn.Platform.Events.Functions;
using Altinn.Platform.Events.Functions.Services;
using Altinn.Platform.Events.Functions.Services.Interfaces;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Hosting;
using Microsoft.Extensions.DependencyInjection;

[assembly: WebJobsStartup(typeof(Startup))]

namespace Altinn.Platform.Events.Functions
{
    /// <summary>
    /// Function events startup
    /// </summary>
    public class Startup : IWebJobsStartup
    {
        /// <summary>
        /// Gets functions project configuration
        /// </summary>
        public void Configure(IWebJobsBuilder builder)
        {
            builder.Services.AddSingleton<PushEventsService, PushEventsService>();
        }
    }
}