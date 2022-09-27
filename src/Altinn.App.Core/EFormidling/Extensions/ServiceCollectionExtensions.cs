using Altinn.App.Core.EFormidling.Implementation;
using Altinn.App.Core.EFormidling.Interface;
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
    /// Add Eformidling services and app specific <see cref="Altinn.App.Core.EFormidling.Interface.IEFormidlingMetadata"/> implementation.
    /// Default implementation of <see cref="Altinn.App.Core.EFormidling.Interface.IEFormidlingReceivers"/> will be registered <see cref="Altinn.App.Core.EFormidling.Implementation.DefaultEFormidlingReceivers"/>.
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection"/> being built.</param>
    /// <param name="configuration">A reference to the current <see cref="IConfiguration"/> object.</param>
    /// <typeparam name="TM">App specific implementation of <see cref="Altinn.App.Core.EFormidling.Interface.IEFormidlingMetadata"/></typeparam>
    public static void AddEFormidlingServices<TM>(this IServiceCollection services, IConfiguration configuration) where TM: IEFormidlingMetadata
    {
        services.AddHttpClient<IEFormidlingClient, Altinn.Common.EFormidlingClient.EFormidlingClient>();
        services.AddTransient<IEFormidlingReceivers, DefaultEFormidlingReceivers>();
        services.AddTransient<IEFormidlingService, DefaultEFormidlingService>();
        services.Configure<Altinn.Common.EFormidlingClient.Configuration.EFormidlingClientSettings>(configuration.GetSection("EFormidlingClientSettings"));
        services.AddTransient(typeof(IEFormidlingMetadata), typeof(TM));
    }
    
    /// <summary>
    /// Add Eformidling services and app specific <see cref="Altinn.App.Core.EFormidling.Interface.IEFormidlingMetadata" /> and <see cref="Altinn.App.Core.EFormidling.Interface.IEFormidlingReceivers" /> implementation.
    /// <see cref="Altinn.App.Core.EFormidling.Implementation.DefaultEFormidlingReceivers" /> will not be registered.
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection"/> being built.</param>
    /// <param name="configuration">A reference to the current <see cref="IConfiguration"/> object.</param>
    /// <typeparam name="TM">App specific implementation of <see cref="Altinn.App.Core.EFormidling.Interface.IEFormidlingMetadata"/></typeparam>
    /// <typeparam name="TR">App specific implementation of <see cref="Altinn.App.Core.EFormidling.Interface.IEFormidlingReceivers"/></typeparam>
    public static void AddEFormidlingServices<TM, TR>(this IServiceCollection services, IConfiguration configuration) where TM: IEFormidlingMetadata where TR: IEFormidlingReceivers
    {
        services.AddHttpClient<IEFormidlingClient, Altinn.Common.EFormidlingClient.EFormidlingClient>();
        services.AddTransient(typeof(IEFormidlingReceivers), typeof(TR));
        services.AddTransient<IEFormidlingService, DefaultEFormidlingService>();
        services.Configure<Altinn.Common.EFormidlingClient.Configuration.EFormidlingClientSettings>(configuration.GetSection("EFormidlingClientSettings"));
        services.AddTransient(typeof(IEFormidlingMetadata), typeof(TM));
    }
}
