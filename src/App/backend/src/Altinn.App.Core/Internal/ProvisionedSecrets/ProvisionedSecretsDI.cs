using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.ProvisionedSecrets;

internal static class ProvisionedSecretsDI
{
    /// <summary>
    /// Adds the channel the platform's provisioned secrets are read through. TryAdd so a test can put its own
    /// channel in first; where the secrets are provisioned is otherwise the channel's decision alone.
    /// </summary>
    /// <param name="services">The service collection</param>
    public static IServiceCollection AddProvisionedSecrets(this IServiceCollection services)
    {
        services.TryAddSingleton(sp =>
            ProvisionedSecrets.ForPlatform(
                sp.GetRequiredService<RuntimeEnvironment>(),
                sp.GetRequiredService<IConfiguration>()
            )
        );

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
