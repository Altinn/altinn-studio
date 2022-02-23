using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Authorization.Functions.Clients;
using Altinn.Platform.Authorization.Functions.Configuration;
using Altinn.Platform.Authorization.Functions.Services;
using Altinn.Platform.Authorization.Functions.Services.Interfaces;
using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Azure.Functions.Extensions.DependencyInjection;

[assembly: FunctionsStartup(typeof(Altinn.Platform.Authorization.Functions.Startup))]

namespace Altinn.Platform.Authorization.Functions
{
    /// <summary>
    /// Function events startup
    /// </summary>
    public class Startup : FunctionsStartup
    {
        /// <summary>
        /// Gets functions project configuration
        /// </summary>
        public override void Configure(IFunctionsHostBuilder builder)
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
            builder.Services.AddSingleton<IAccessTokenProvider, AccessTokenProvider>();
            builder.Services.AddSingleton<IKeyVaultService, KeyVaultService>();
            builder.Services.AddSingleton<IEventPusherService, EventPusherService>();
            builder.Services.AddHttpClient<BridgeClient>();
        }
    }
}
