using Altinn.App.Core.EFormidling.Interface;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Altinn.App.Core.EFormidling.Configuration;

/// <summary>
/// Both stages of the eFormidling registration. One object implements both interfaces; which of them
/// the caller is holding is what constrains the calls available at each point.
/// </summary>
internal sealed class EFormidlingBuilder(IServiceCollection services) : IEFormidlingMetadataStage, IEFormidlingBuilder
{
    /// <inheritdoc />
    public IEFormidlingBuilder WithMetadata<TMetadata>()
        where TMetadata : IEFormidlingMetadata
    {
        // Replace rather than Add: a second call should mean "this one instead", not leave the first
        // registration in the container to be picked up by anything enumerating the service.
        services.Replace(ServiceDescriptor.Transient(typeof(IEFormidlingMetadata), typeof(TMetadata)));
        return this;
    }

    /// <inheritdoc />
    public IEFormidlingBuilder WithReceivers<TReceivers>()
        where TReceivers : IEFormidlingReceivers
    {
        services.Replace(ServiceDescriptor.Transient(typeof(IEFormidlingReceivers), typeof(TReceivers)));
        return this;
    }

    /// <inheritdoc />
    public IEFormidlingBuilder WithConfig(Action<EFormidlingClientSettings> configure)
    {
        ArgumentNullException.ThrowIfNull(configure);

        services.AddOptions<EFormidlingClientSettings>().Configure(configure);
        return this;
    }

    /// <inheritdoc />
    public IEFormidlingBuilder WithConfig(string configSectionPath)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(configSectionPath);

        services.AddOptions<EFormidlingClientSettings>().BindConfiguration(configSectionPath);
        return this;
    }
}
