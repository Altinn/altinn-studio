using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.ProvisionedSecrets;

internal static class ProvisionedSecretsDI
{
    /// <summary>
    /// Adds the channel the platform's provisioned secrets are read through. TryAdd so a test can put its own
    /// channel in first; where the secrets are provisioned is otherwise the platform's decision alone.
    /// </summary>
    /// <param name="services">The service collection</param>
    public static IServiceCollection AddProvisionedSecrets(this IServiceCollection services)
    {
        services.TryAddSingleton(sp => ProvisionedSecrets.FromConfiguration(sp.GetRequiredService<IConfiguration>()));

        // Building the channel is what reads the variables that say where the secrets are, and a tenant only
        // builds it when something asks for its secret - which for Maskinporten can be hours into the app's
        // life. The startup check pulls that read forward to host startup, so an environment that never told
        // the app where to look fails to start, naming the variable, instead of failing one request much later.
        services.TryAddEnumerable(ServiceDescriptor.Singleton<IHostedService, ProvisionedSecretsStartupCheck>());

        return services;
    }

    /// <summary>
    /// Binds <typeparamref name="TOptions"/> to the contents of <paramref name="file"/>. Registered by hand
    /// rather than through <c>OptionsBuilder.Bind</c> so that the private configuration root holding the
    /// provisioned secrets is created — and disposed — by the container.
    /// </summary>
    /// <typeparam name="TOptions">The options type the file's contents bind to.</typeparam>
    /// <param name="services">The service collection</param>
    /// <param name="file">One of the files named in <see cref="ProvisionedSecretFiles.All"/>.</param>
    public static IServiceCollection BindProvisionedSecret<TOptions>(
        this IServiceCollection services,
        ProvisionedSecretFile file
    )
        where TOptions : class
    {
        services.AddProvisionedSecrets();
        services.AddOptions<TOptions>();
        services.TryAddEnumerable(
            ServiceDescriptor.Singleton<IConfigureOptions<TOptions>, ProvisionedOptions<TOptions>>(
                sp => new ProvisionedOptions<TOptions>(sp.GetRequiredService<ProvisionedSecrets>(), file)
            )
        );
        services.TryAddEnumerable(
            ServiceDescriptor.Singleton<IOptionsChangeTokenSource<TOptions>, ProvisionedOptions<TOptions>>(
                sp => new ProvisionedOptions<TOptions>(sp.GetRequiredService<ProvisionedSecrets>(), file)
            )
        );

        return services;
    }
}

/// <summary>
/// Opens the provisioned secrets channel at host startup, so that an environment which never said where the
/// secrets are fails to start rather than failing the first request that needs one. The channel is resolved
/// here rather than injected, so that the failure belongs to starting the host and not to constructing this
/// service.
/// </summary>
/// <param name="serviceProvider">The application's services.</param>
internal sealed class ProvisionedSecretsStartupCheck(IServiceProvider serviceProvider) : IHostedService
{
    public Task StartAsync(CancellationToken cancellationToken)
    {
        serviceProvider.GetRequiredService<ProvisionedSecrets>();
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
