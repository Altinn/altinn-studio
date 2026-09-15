using Altinn.App.Core.EFormidling.Configuration;
using Altinn.App.Core.EFormidling.Implementation;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Extensions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Altinn.App.Core.EFormidling.Extensions;

/// <summary>
/// Registers the services an eFormidling service task needs.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// The configuration section <see cref="EFormidlingClientSettings"/> binds to unless the app says
    /// otherwise through <see cref="IEFormidlingBuilder.WithConfig(string)"/>.
    /// </summary>
    private const string DefaultConfigSectionPath = "EFormidlingClientSettings";

    /// <summary>
    /// Adds eFormidling to the app and returns a builder for the rest of the registration.
    /// </summary>
    /// <remarks>
    /// <para>
    /// The returned stage exposes only <see cref="IEFormidlingMetadataStage.WithMetadata{TMetadata}"/>,
    /// because an app cannot ship anything without its own metadata generator. The remaining calls
    /// become available once that is supplied, and all of them are optional:
    /// </para>
    /// <code>
    /// services
    ///     .AddEFormidling()
    ///     .WithMetadata&lt;MyEFormidlingMetadata&gt;()
    ///     .WithReceivers&lt;MyEFormidlingReceivers&gt;();
    /// </code>
    /// </remarks>
    /// <param name="services">The <see cref="IServiceCollection"/> being built.</param>
    /// <returns>A builder that must be completed with <c>WithMetadata&lt;T&gt;()</c>.</returns>
    public static IEFormidlingMetadataStage AddEFormidling(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        // Skipped when the app has already configured the settings itself, so binding the conventional
        // section stays a default rather than something layered on top of a deliberate choice.
        if (!services.IsConfigured<EFormidlingClientSettings>())
        {
            services.AddOptions<EFormidlingClientSettings>().BindConfiguration(DefaultConfigSectionPath);
        }

        services.AddHttpClient<IEFormidlingClient, EFormidlingClient>();

        // TryAdd for both: an app that registered its own implementation before this call keeps it,
        // and one registering after still wins by last-in for a single-service resolve.
        services.TryAddTransient<IEFormidlingService, DefaultEFormidlingService>();
        services.TryAddTransient<IEFormidlingReceivers, DefaultEFormidlingReceivers>();

        return new EFormidlingBuilder(services);
    }
}
