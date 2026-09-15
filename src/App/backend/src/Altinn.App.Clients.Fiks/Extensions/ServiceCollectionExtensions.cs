using Altinn.App.Clients.Fiks.Configuration;
using Altinn.App.Clients.Fiks.FiksArkiv;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.AltinnCdn;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Clients.Fiks.Extensions;

/// <summary>
/// Extension methods for setting up Fiks IO and Fiks Arkiv services.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Adds a Fiks IO client to the service collection.
    /// </summary>
    /// <param name="services">The target <see cref="IServiceCollection"/>.</param>
    /// <returns>A <see cref="FiksIOSetupBuilder"/> instance that can be used to configure the Fiks IO client.</returns>
    public static IFiksIOSetupBuilder AddFiksIOClient(this IServiceCollection services)
    {
        if (services.IsConfigured<FiksIOSettings>() is false)
            services.ConfigureFiksIOClient("FiksIOSettings");

        services.AddSingleton<IFiksIOClientFactory, FiksIOClientFactory>();
        services.AddSingleton<IFiksIOClient, FiksIOClient>();

        return new FiksIOSetupBuilder(services);
    }

    /// <summary>
    /// Adds a Fiks Arkiv client and all relevant dependencies to the service collection.
    /// </summary>
    /// <param name="services">The target <see cref="IServiceCollection"/>.</param>
    /// <returns>A <see cref="FiksSetupBuilder"/> instance that can be used to configure the Fiks Arkiv client.</returns>
    public static IFiksArkivSetupBuilder AddFiksArkiv(this IServiceCollection services)
    {
        if (services.IsConfigured<FiksArkivSettings>() is false)
            services.ConfigureFiksArkiv("FiksArkivSettings");

        services.AddFiksIOClient();
        services.AddAltinnCdnClient();
        // Transient, like every other service task: `Define` runs per resolution.
        services.AddTransient<IPipelineServiceTask, FiksArkivServiceTask>();
        services.AddSingleton<IFiksArkivMessageSender, FiksArkivMessageSender>();
        services.AddSingleton<IFiksArkivPayloadGenerator, FiksArkivDefaultPayloadGenerator>();
        services.AddSingleton<IFiksArkivInstanceClient, FiksArkivInstanceClient>();
        services.AddSingleton<IFiksArkivConfigResolver, FiksArkivConfigResolver>();
        services.AddHostedService<FiksArkivConfigValidationService>();
        services.AddHostedService<FiksArkivSubscriber>();

        return new FiksArkivSetupBuilder(services);
    }

    /// <summary>
    /// Configures the Fiks IO client with the provided options.
    /// </summary>
    /// <param name="services">The target <see cref="IServiceCollection"/>.</param>
    /// <param name="configureOptions">Configuration delegate.</param>
    public static IServiceCollection ConfigureFiksIOClient(
        this IServiceCollection services,
        Action<FiksIOSettings> configureOptions
    )
    {
        services.AddOptions<FiksIOSettings>().Configure(configureOptions).ValidateDataAnnotations();
        return services;
    }

    /// <summary>
    /// Configures the Fiks IO client with the options from the specified configuration section.
    /// </summary>
    /// <param name="services">The target <see cref="IServiceCollection"/>.</param>
    /// <param name="configSectionPath">Configuration section path.</param>
    public static IServiceCollection ConfigureFiksIOClient(this IServiceCollection services, string configSectionPath)
    {
        services.AddOptions<FiksIOSettings>().BindConfiguration(configSectionPath).ValidateDataAnnotations();
        return services;
    }

    /// <summary>
    /// Configures the Fiks Arkiv client with the provided options.
    /// </summary>
    /// <param name="services">The target <see cref="IServiceCollection"/>.</param>
    /// <param name="configureOptions">Configuration delegate.</param>
    public static IServiceCollection ConfigureFiksArkiv(
        this IServiceCollection services,
        Action<FiksArkivSettings> configureOptions
    )
    {
        services.AddOptions<FiksArkivSettings>().Configure(configureOptions);
        return services;
    }

    /// <summary>
    /// Configures the Fiks Arkiv client with the options from the specified configuration section.
    /// </summary>
    /// <param name="services">The target <see cref="IServiceCollection"/>.</param>
    /// <param name="configSectionPath">Configuration section path.</param>
    public static IServiceCollection ConfigureFiksArkiv(this IServiceCollection services, string configSectionPath)
    {
        services
            .AddOptions<FiksArkivSettings>()
            .Configure(options =>
            {
                options.ErrorHandling = null;
                options.SuccessHandling = null;
                options.Documents = null;
                options.Receipt = null;
                options.Recipient = null;
                options.Metadata = null;
            })
            .BindConfiguration(configSectionPath);
        return services;
    }
}
