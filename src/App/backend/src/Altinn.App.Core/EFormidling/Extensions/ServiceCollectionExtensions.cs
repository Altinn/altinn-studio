using Altinn.App.Core.EFormidling.Implementation;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Features;
using Altinn.Common.EFormidlingClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.EFormidling.Extensions;

/// <summary>
/// Service extension for the EFormidlingClient. Used to register the EFormidling services used in Dependency Injection.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Add Eformidling services and app specific <see cref="IEFormidlingMetadata"/> implementation.
    /// Default implementation of <see cref="IEFormidlingReceivers"/> will be registered <see cref="DefaultEFormidlingReceivers"/>.
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection"/> being built.</param>
    /// <param name="configuration">A reference to the current <see cref="IConfiguration"/> object.</param>
    /// <typeparam name="TM">App specific implementation of <see cref="IEFormidlingMetadata"/></typeparam>
    public static void AddEFormidlingServices<TM>(this IServiceCollection services, IConfiguration configuration)
        where TM : IEFormidlingMetadata
    {
        AddEFormidlingServices2<TM, DefaultEFormidlingReceivers>(services, configuration);
    }

    /// <summary>
    /// Add Eformidling services and app specific <see cref="IEFormidlingMetadata" /> and <see cref="IEFormidlingReceivers" /> implementation.
    /// <see cref="DefaultEFormidlingReceivers" /> will not be registered.
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection"/> being built.</param>
    /// <param name="configuration">A reference to the current <see cref="IConfiguration"/> object.</param>
    /// <typeparam name="TM">App specific implementation of <see cref="IEFormidlingMetadata"/></typeparam>
    /// <typeparam name="TR">App specific implementation of <see cref="IEFormidlingReceivers"/></typeparam>
    [Obsolete("Use AddEformidlingServices2 instead. This method will be removed in V9.")]
    public static void AddEFormidlingServices<TM, TR>(this IServiceCollection services, IConfiguration configuration)
        where TM : IEFormidlingMetadata
        where TR : IEFormidlingReceivers
    {
        services.AddTransient(typeof(IEFormidlingReceivers), typeof(TR));
        services.AddHttpClient<IEFormidlingClient, Common.EFormidlingClient.EFormidlingClient>();
        services.AddTransient<IEFormidlingLegacyConfigurationProvider, EFormidlingLegacyConfigurationProvider>();
        services.AddTransient<IEFormidlingService, DefaultEFormidlingService>();
        services.Configure<Common.EFormidlingClient.Configuration.EFormidlingClientSettings>(
            configuration.GetSection("EFormidlingClientSettings")
        );
        services.AddTransient(typeof(IEFormidlingMetadata), typeof(TM));
        services.AddTransient<IEventHandler, EformidlingStatusCheckEventHandler>();
        services.AddHostedService<EformidlingStartup>();
    }

    /// <summary>
    /// Add Eformidling services and app specific <see cref="IEFormidlingMetadata" /> and <see cref="IEFormidlingReceivers" /> implementation.
    /// <see cref="DefaultEFormidlingReceivers" /> will not be registered.
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection"/> being built.</param>
    /// <param name="configuration">A reference to the current <see cref="IConfiguration"/> object.</param>
    /// <typeparam name="TM">App specific implementation of <see cref="IEFormidlingMetadata"/></typeparam>
    /// <typeparam name="TR">App specific implementation of <see cref="IEFormidlingReceivers"/></typeparam>
    public static void AddEFormidlingServices2<TM, TR>(this IServiceCollection services, IConfiguration configuration)
        where TM : IEFormidlingMetadata
        where TR : IEFormidlingReceivers
    {
        services.AddTransient(typeof(IEFormidlingReceivers), typeof(TR));
        services.AddHttpClient<IEFormidlingClient, Common.EFormidlingClient.EFormidlingClient>();
        services.AddTransient<IEFormidlingLegacyConfigurationProvider, EFormidlingLegacyConfigurationProvider>();
        services.AddTransient<IEFormidlingService, DefaultEFormidlingService>();
        services.Configure<Common.EFormidlingClient.Configuration.EFormidlingClientSettings>(
            configuration.GetSection("EFormidlingClientSettings")
        );
        services.AddTransient(typeof(IEFormidlingMetadata), typeof(TM));
        services.AddTransient<IEventHandler, EformidlingStatusCheckEventHandler2>();
        services.AddHostedService<EformidlingStartup>();
    }
}
