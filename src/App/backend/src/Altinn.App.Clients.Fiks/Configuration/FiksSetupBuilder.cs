using Altinn.App.Clients.Fiks.Constants;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksArkiv;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Features.Maskinporten.Extensions;
using Altinn.App.Core.Features.Maskinporten.Models;
using Microsoft.Extensions.DependencyInjection;
using Polly;
using Polly.DependencyInjection;

namespace Altinn.App.Clients.Fiks.Configuration;

internal abstract class FiksSetupBuilder(IServiceCollection services)
{
    /// <inheritdoc cref="IFiksSetupBuilder{T}.WithFiksIOConfig(System.Action{Altinn.App.Clients.Fiks.FiksIO.Models.FiksIOSettings})"/>
    protected FiksSetupBuilder ConfigureFiksIO(Action<FiksIOSettings> configureOptions)
    {
        services.ConfigureFiksIOClient(configureOptions);
        return this;
    }

    /// <inheritdoc cref="IFiksSetupBuilder{T}.WithFiksIOConfig(string)"/>
    protected FiksSetupBuilder ConfigureFiksIO(string configSectionPath)
    {
        services.ConfigureFiksIOClient(configSectionPath);
        return this;
    }

    /// <summary>
    /// Configures the Fiks Arkiv client with the provided options.
    /// </summary>
    /// <param name="configureOptions">Configuration delegate.</param>
    /// <returns>The builder instance.</returns>
    protected FiksSetupBuilder ConfigureFiksArkiv(Action<FiksArkivSettings> configureOptions)
    {
        services.ConfigureFiksArkiv(configureOptions);
        return this;
    }

    /// <summary>
    /// Configures the Fiks Arkiv client with the options from the specified configuration section.
    /// </summary>
    /// <param name="configSectionPath">Configuration section path.</param>
    /// <returns>The builder instance.</returns>
    protected FiksSetupBuilder ConfigureFiksArkiv(string configSectionPath)
    {
        services.ConfigureFiksArkiv(configSectionPath);
        return this;
    }

    /// <inheritdoc cref="IFiksSetupBuilder{T}.WithMaskinportenConfig(System.Action{Altinn.App.Core.Features.Maskinporten.Models.MaskinportenSettings})"/>
    protected FiksSetupBuilder ConfigureMaskinporten(Action<MaskinportenSettings> configureOptions)
    {
        services.ConfigureMaskinportenClient(configureOptions);
        return this;
    }

    /// <inheritdoc cref="IFiksSetupBuilder{T}.WithMaskinportenConfig(string)"/>
    protected FiksSetupBuilder ConfigureMaskinporten(string configSectionPath)
    {
        services.ConfigureMaskinportenClient(configSectionPath);
        return this;
    }

    /// <summary>
    /// Registers a custom message response handler for Fiks Arkiv messages.
    /// </summary>
    /// <typeparam name="THandler">The implementation of the message response handler.</typeparam>
    /// <returns>The builder instance.</returns>
    protected FiksSetupBuilder UseMessageResponseHandler<THandler>()
        where THandler : IFiksArkivResponseHandler
    {
        services.AddTransient(typeof(IFiksArkivResponseHandler), typeof(THandler));
        return this;
    }

    /// <summary>
    /// Registers a custom payload generator for Fiks Arkiv messages.
    /// </summary>
    /// <typeparam name="TGenerator">The implementation of the message payload generator.</typeparam>
    /// <returns>The builder instance.</returns>
    protected FiksSetupBuilder UseMessagePayloadGenerator<TGenerator>()
        where TGenerator : IFiksArkivPayloadGenerator
    {
        services.AddTransient(typeof(IFiksArkivPayloadGenerator), typeof(TGenerator));
        return this;
    }

    /// <inheritdoc cref="IFiksSetupBuilder{T}.WithResiliencePipeline"/>
    protected FiksSetupBuilder ConfigureResiliencePipeline(
        Action<ResiliencePipelineBuilder<FiksIOMessageResponse>, AddResiliencePipelineContext<string>> configure
    )
    {
        services.AddResiliencePipeline(FiksIOConstants.UserDefinedResiliencePipelineId, configure);
        return this;
    }

    /// <inheritdoc cref="IFiksSetupBuilder{T}.CompleteSetup"/>
    public IServiceCollection CompleteSetup() => services;
}

/// <summary>
/// Fiks IO setup builder.
/// </summary>
internal sealed class FiksIOSetupBuilder(IServiceCollection services) : FiksSetupBuilder(services), IFiksIOSetupBuilder
{
    /// <inheritdoc />
    public IFiksIOSetupBuilder WithFiksIOConfig(Action<FiksIOSettings> configureOptions) =>
        (IFiksIOSetupBuilder)ConfigureFiksIO(configureOptions);

    /// <inheritdoc />
    public IFiksIOSetupBuilder WithFiksIOConfig(string configSectionPath) =>
        (IFiksIOSetupBuilder)ConfigureFiksIO(configSectionPath);

    /// <inheritdoc />
    public IFiksIOSetupBuilder WithMaskinportenConfig(Action<MaskinportenSettings> configureOptions) =>
        (IFiksIOSetupBuilder)ConfigureMaskinporten(configureOptions);

    /// <inheritdoc />
    public IFiksIOSetupBuilder WithMaskinportenConfig(string configSectionPath) =>
        (IFiksIOSetupBuilder)ConfigureMaskinporten(configSectionPath);

    /// <inheritdoc />
    public IFiksIOSetupBuilder WithResiliencePipeline(
        Action<ResiliencePipelineBuilder<FiksIOMessageResponse>, AddResiliencePipelineContext<string>> configure
    ) => (IFiksIOSetupBuilder)ConfigureResiliencePipeline(configure);
}

/// <summary>
/// Fiks Arkiv setup builder.
/// </summary>
internal sealed class FiksArkivSetupBuilder(IServiceCollection services)
    : FiksSetupBuilder(services),
        IFiksArkivSetupBuilder
{
    /// <inheritdoc />
    public IFiksArkivSetupBuilder WithFiksIOConfig(string configSectionPath) =>
        (IFiksArkivSetupBuilder)ConfigureFiksIO(configSectionPath);

    /// <inheritdoc />
    public IFiksArkivSetupBuilder WithFiksIOConfig(Action<FiksIOSettings> configureOptions) =>
        (IFiksArkivSetupBuilder)ConfigureFiksIO(configureOptions);

    /// <inheritdoc />
    public IFiksArkivSetupBuilder WithMaskinportenConfig(Action<MaskinportenSettings> configureOptions) =>
        (IFiksArkivSetupBuilder)ConfigureMaskinporten(configureOptions);

    /// <inheritdoc />
    public IFiksArkivSetupBuilder WithMaskinportenConfig(string configSectionPath) =>
        (IFiksArkivSetupBuilder)ConfigureMaskinporten(configSectionPath);

    /// <inheritdoc />
    public IFiksArkivSetupBuilder WithResiliencePipeline(
        Action<ResiliencePipelineBuilder<FiksIOMessageResponse>, AddResiliencePipelineContext<string>> configure
    ) => (IFiksArkivSetupBuilder)ConfigureResiliencePipeline(configure);

    /// <inheritdoc />
    public IFiksArkivSetupBuilder WithFiksArkivConfig(Action<FiksArkivSettings> configureOptions) =>
        (IFiksArkivSetupBuilder)ConfigureFiksArkiv(configureOptions);

    /// <inheritdoc />
    public IFiksArkivSetupBuilder WithFiksArkivConfig(string configSectionPath) =>
        (IFiksArkivSetupBuilder)ConfigureFiksArkiv(configSectionPath);

    /// <inheritdoc />
    public IFiksArkivSetupBuilder WithResponseHandler<TMessageHandler>()
        where TMessageHandler : IFiksArkivResponseHandler =>
        (IFiksArkivSetupBuilder)UseMessageResponseHandler<TMessageHandler>();

    /// <inheritdoc />
    public IFiksArkivSetupBuilder WithPayloadGenerator<TMessageHandler>()
        where TMessageHandler : IFiksArkivPayloadGenerator =>
        (IFiksArkivSetupBuilder)UseMessagePayloadGenerator<TMessageHandler>();
}
