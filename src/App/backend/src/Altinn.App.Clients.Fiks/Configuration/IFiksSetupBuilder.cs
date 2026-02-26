using Altinn.App.Clients.Fiks.FiksArkiv;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Features.Maskinporten.Models;
using Microsoft.Extensions.DependencyInjection;
using Polly;
using Polly.DependencyInjection;

namespace Altinn.App.Clients.Fiks.Configuration;

/// <summary>
/// Builder for configuring common Fiks behavior.
/// </summary>
public interface IFiksSetupBuilder<out T>
{
    /// <summary>
    /// Configures the Fiks IO client with the provided options.
    /// </summary>
    /// <param name="configureOptions">Configuration delegate.</param>
    /// <returns>The builder instance.</returns>
    T WithFiksIOConfig(Action<FiksIOSettings> configureOptions);

    /// <summary>
    /// Configures the Fiks IO client with the options from the specified configuration section.
    /// </summary>
    /// <param name="configSectionPath">Configuration section path.</param>
    /// <returns>The builder instance.</returns>
    T WithFiksIOConfig(string configSectionPath);

    /// <summary>
    /// Configures the underlying Maskinporten client with the provided options.
    /// </summary>
    /// <param name="configureOptions">Configuration delegate.</param>
    /// <returns>The builder instance.</returns>
    T WithMaskinportenConfig(Action<MaskinportenSettings> configureOptions);

    /// <summary>
    /// Configures the underlying Maskinporten client with the options from the specified configuration section.
    /// </summary>
    /// <param name="configSectionPath">Configuration section path.</param>
    /// <returns>The builder instance.</returns>
    T WithMaskinportenConfig(string configSectionPath);

    /// <summary>
    /// Configures the resilience pipeline (retry behavior) for the Fiks IO client.
    /// </summary>
    /// <param name="configure">Configuration delegate.</param>
    /// <returns>The builder instance.</returns>
    T WithResiliencePipeline(
        Action<ResiliencePipelineBuilder<FiksIOMessageResponse>, AddResiliencePipelineContext<string>> configure
    );

    /// <summary>
    /// Completes the setup and returns the service collection.
    /// </summary>
    IServiceCollection CompleteSetup();
}

/// <summary>
/// Builder for configuring the Fiks IO client behavior.
/// </summary>
public interface IFiksIOSetupBuilder : IFiksSetupBuilder<IFiksIOSetupBuilder> { }

/// <summary>
/// Builder for configuring the Fiks Arkiv client behavior.
/// </summary>
public interface IFiksArkivSetupBuilder : IFiksSetupBuilder<IFiksArkivSetupBuilder>
{
    /// <summary>
    /// Configures the Fiks Arkiv client with the provided options.
    /// </summary>
    /// <param name="configureOptions">Configuration delegate.</param>
    /// <returns>The builder instance.</returns>
    IFiksArkivSetupBuilder WithFiksArkivConfig(Action<FiksArkivSettings> configureOptions);

    /// <summary>
    /// Configures the Fiks Arkiv client with the options from the specified configuration section.
    /// </summary>
    /// <param name="configSectionPath">Configuration section path.</param>
    /// <returns>The builder instance.</returns>
    IFiksArkivSetupBuilder WithFiksArkivConfig(string configSectionPath);

    /// <summary>
    /// Configures the message response handler for the Fiks Arkiv client.
    /// This handler is responsible for handling incoming messages from Fiks Arkiv.
    /// </summary>
    /// <typeparam name="TMessageHandler">The handler type you wish to register for use.</typeparam>
    /// <returns>The builder instance.</returns>
    IFiksArkivSetupBuilder WithResponseHandler<TMessageHandler>()
        where TMessageHandler : IFiksArkivResponseHandler;

    /// <summary>
    /// Configures the payload generator for Fiks Arkiv message requests.
    /// This handler is responsible for producing the content to be send via Fiks Arkiv (arkivmelding.xml and attachments).
    /// </summary>
    /// <typeparam name="TMessageHandler">The generator type you wish to register for use.</typeparam>
    /// <returns>The builder instance.</returns>
    IFiksArkivSetupBuilder WithPayloadGenerator<TMessageHandler>()
        where TMessageHandler : IFiksArkivPayloadGenerator;
}
