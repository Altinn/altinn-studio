using System.Collections.Frozen;
using Altinn.App.Core.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal;

internal static class RuntimeEnvironmentDI
{
    public static IServiceCollection AddRuntimeEnvironment(this IServiceCollection services)
    {
        services.AddSingleton<RuntimeEnvironment>();
        return services;
    }
}

internal sealed class RuntimeEnvironment(
    IOptionsMonitor<GeneralSettings> _generalSettings,
    IOptionsMonitor<PlatformSettings> _platformSettings
)
{
    private static readonly FrozenSet<string> _expectedHostnames = new[]
    {
        "local.altinn.cloud", // Current hostname for localtest
        "altinn3local.no", // Old hostname for localtest
    }.ToFrozenSet(StringComparer.OrdinalIgnoreCase);

    public bool IsLocaltestPlatform()
    {
        var hostName = _generalSettings.CurrentValue.HostName;
        var colonIdx = hostName.IndexOf(':');
        if (colonIdx >= 0)
            hostName = hostName[..colonIdx];

        return _expectedHostnames.Contains(hostName);
    }

    public string GetPlatformBaseUrl() =>
        new Uri(_platformSettings.CurrentValue.ApiStorageEndpoint).GetLeftPart(UriPartial.Authority);
}
