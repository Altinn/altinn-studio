using Altinn.App.Core.EFormidling.Implementation;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Features;

namespace Altinn.App.Core.EFormidling.Configuration;

/// <summary>
/// The first stage of an eFormidling registration, returned by <c>AddEFormidling()</c>.
/// </summary>
/// <remarks>
/// The built-in <see cref="IEFormidlingService"/> builds its shipment from an app-supplied
/// <see cref="IEFormidlingMetadata"/> — it produces the arkivmelding, which no default could stand in
/// for — so that is the only call this stage offers. Everything else lives on
/// <see cref="IEFormidlingBuilder"/>, which you reach by making it. (An app registering its own
/// <see cref="IEFormidlingService"/> composes the whole shipment itself and needs no metadata generator;
/// startup validation asks for one only where the built-in service is the one in use.)
/// </remarks>
[IncompleteBuilder(
    $"Complete it by calling WithMetadata<T>() with your {nameof(IEFormidlingMetadata)} implementation."
        + $" If the app registers its own {nameof(IEFormidlingService)} and needs nothing else here, discard the result explicitly with '_ ='"
)]
public interface IEFormidlingMetadataStage
{
    /// <summary>
    /// Registers the app's <see cref="IEFormidlingMetadata"/> implementation, which generates the
    /// metadata document (typically arkivmelding.xml) for each shipment.
    /// </summary>
    /// <typeparam name="TMetadata">The app's <see cref="IEFormidlingMetadata"/> implementation.</typeparam>
    /// <returns>A builder for the optional parts of the registration.</returns>
    IEFormidlingBuilder WithMetadata<TMetadata>()
        where TMetadata : IEFormidlingMetadata;
}

/// <summary>
/// Configures the optional parts of an eFormidling registration. Every call is optional: the defaults
/// registered by <c>AddEFormidling()</c> are a working setup once metadata has been supplied.
/// </summary>
public interface IEFormidlingBuilder
{
    /// <summary>
    /// Registers the app's <see cref="IEFormidlingReceivers"/> implementation in place of
    /// <see cref="DefaultEFormidlingReceivers"/>, which reads the receiver from the service task's
    /// configuration.
    /// </summary>
    /// <typeparam name="TReceivers">The app's <see cref="IEFormidlingReceivers"/> implementation.</typeparam>
    /// <returns>The builder instance.</returns>
    IEFormidlingBuilder WithReceivers<TReceivers>()
        where TReceivers : IEFormidlingReceivers;

    /// <summary>
    /// Configures <see cref="EFormidlingClientSettings"/> with the supplied delegate.
    /// </summary>
    /// <remarks>
    /// Options sources are layered in call order, so this runs after the default binding to the
    /// <c>EFormidlingClientSettings</c> configuration section and wins for every value it sets.
    /// </remarks>
    /// <param name="configure">Configuration delegate.</param>
    /// <returns>The builder instance.</returns>
    IEFormidlingBuilder WithConfig(Action<EFormidlingClientSettings> configure);

    /// <summary>
    /// Binds <see cref="EFormidlingClientSettings"/> to the named configuration section.
    /// </summary>
    /// <remarks>
    /// Options sources are layered in call order, so this section is read after the default
    /// <c>EFormidlingClientSettings</c> section and wins for every key it defines.
    /// </remarks>
    /// <param name="configSectionPath">Configuration section path.</param>
    /// <returns>The builder instance.</returns>
    IEFormidlingBuilder WithConfig(string configSectionPath);
}
