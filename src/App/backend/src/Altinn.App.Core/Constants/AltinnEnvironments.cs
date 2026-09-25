using System.Collections.Frozen;
using System.Globalization;
using Microsoft.Extensions.Hosting;

namespace Altinn.App.Core.Constants;

internal static class AltinnEnvironments
{
    public static IReadOnlyDictionary<HostingEnvironment, IEnumerable<string>> Map { get; } =
        new Dictionary<HostingEnvironment, IEnumerable<string>>
        {
            [HostingEnvironment.Development] =
            [
                Environments.Development.ToLower(CultureInfo.InvariantCulture),
                "dev",
                "local",
                "localtest",
            ],
            [HostingEnvironment.Staging] =
            [
                Environments.Staging.ToLower(CultureInfo.InvariantCulture),
                "test",
                "at22",
                "at23",
                "at24",
                "tt02",
                "yt01",
            ],
            [HostingEnvironment.Production] =
            [
                Environments.Production.ToLower(CultureInfo.InvariantCulture),
                "prod",
                "produksjon",
            ],
        }.ToFrozenDictionary();

    public static HostingEnvironment GetHostingEnvironment(string environmentName)
    {
        var envNameLower = environmentName.ToLower(CultureInfo.InvariantCulture);
        return Map.FirstOrDefault(x => x.Value.Contains(envNameLower)).Key;
    }

    public static HostingEnvironment GetHostingEnvironment(IHostEnvironment hostEnvironment)
    {
        return GetHostingEnvironment(hostEnvironment.EnvironmentName);
    }
}

/// <summary>
/// The kind of environment an app is hosted in, resolved from the host environment name (for example
/// <c>tt02</c> and <c>at22</c> are staging environments). Configuration that varies per environment is
/// resolved against this.
/// </summary>
public enum HostingEnvironment
{
    /// <summary>The environment name matched no known environment.</summary>
    Unknown,

    /// <summary>Local development, including localtest.</summary>
    Development,

    /// <summary>Production.</summary>
    Production,

    /// <summary>A test environment (tt02, at2x, yt01).</summary>
    Staging,
}
