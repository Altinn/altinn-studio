using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Authorization.Functions;
using Altinn.Platform.Authorization.Functions.Clients;
using Altinn.Platform.Authorization.Functions.Configuration;
using Altinn.Platform.Authorization.Functions.Services;
using Altinn.Platform.Authorization.Functions.Services.Interfaces;
using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

[assembly: WebJobsStartup(typeof(Startup))]

namespace Altinn.Platform.Authorization.Functions
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
            builder.Services.AddOptions<PlatformSettings>()
            .Configure<IConfiguration>((settings, configuration) =>
            {
                configuration.GetSection("Platform").Bind(settings);
            });
            builder.Services.AddOptions<KeyVaultSettings>()
            .Configure<IConfiguration>((settings, configuration) =>
            {
                configuration.GetSection("KeyVault").Bind(settings);
            });
            builder.Services.AddSingleton<ITelemetryInitializer, TelemetryInitializer>();
            builder.Services.AddSingleton<IAccessTokenGenerator, AccessTokenGenerator>();
            builder.Services.AddSingleton<IKeyVaultService, KeyVaultService>();
            builder.Services.AddSingleton<IEventPusherService, EventPusherService>();
            builder.Services.AddHttpClient<BridgeClient>();
        }
    }
}
