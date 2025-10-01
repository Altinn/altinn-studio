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

internal enum HostingEnvironment
{
    Unknown,
    Development,
    Production,
    Staging,
}
