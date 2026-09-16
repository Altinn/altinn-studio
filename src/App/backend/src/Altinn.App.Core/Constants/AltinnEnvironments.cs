using System.Collections.Frozen;
using System.Globalization;
using Microsoft.Extensions.Hosting;

namespace Altinn.App.Core.Constants;

internal static class AltinnEnvironments
{
    // Altinn Studio mirrors the table below in
    // src/Designer/frontend/packages/process-editor/src/components/ConfigPanel/EnvironmentConfig/altinnEnvironments.ts
    // so that the process editor offers exactly the environments this runtime resolves. A jest test
    // next to that file parses this one and fails when the two disagree, so update the mirror in
    // the same change as the table.
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
