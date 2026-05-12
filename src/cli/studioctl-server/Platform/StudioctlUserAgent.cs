using System.Reflection;

namespace Altinn.Studio.StudioctlServer.Platform;

internal static class StudioctlUserAgent
{
    private const string ReleaseTagPrefix = "studioctl/";

    public static string Value => $"studioctl/{Version}";

    public static string Version => NormalizeVersion(VersionAttribute.InformationalVersion);

    private static AssemblyInformationalVersionAttribute VersionAttribute =>
        typeof(StudioctlUserAgent).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()
        ?? throw new InvalidOperationException("Assembly informational version is not set");

    private static string NormalizeVersion(string version) =>
        version.StartsWith(ReleaseTagPrefix, StringComparison.Ordinal) ? version[ReleaseTagPrefix.Length..] : version;
}
