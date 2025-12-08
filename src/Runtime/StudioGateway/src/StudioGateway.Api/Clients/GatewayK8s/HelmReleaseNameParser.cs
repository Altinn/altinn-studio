using System.Text.RegularExpressions;

namespace StudioGateway.Api.Clients.GatewayK8s;

/// <summary>
/// Helper for parsing HelmRelease names.
/// </summary>
internal static partial class HelmReleaseNameParser
{
    // HelmRelease name format: {org}-{app}-{studio-env}
    // All parts are lowercase (Kubernetes requirement). org has no hyphens, app can have hyphens
    // Example: ttd-my-app-prod, digdir-some-app-dev
    [GeneratedRegex(@"^(?<org>[a-z0-9]+)-(?<app>[a-z0-9-]+)-(?<env>dev|staging|prod)$")]
    private static partial Regex NamePattern();

    /// <summary>
    /// Tries to parse org, app, and environment from a HelmRelease name.
    /// Expected format: {org}-{app}-{env} where env is one of: dev, staging, prod
    /// </summary>
    public static bool TryParse(string name, out string org, out string app, out string env)
    {
        var match = NamePattern().Match(name);
        if (!match.Success)
        {
            org = string.Empty;
            app = string.Empty;
            env = string.Empty;
            return false;
        }

        org = match.Groups["org"].Value;
        app = match.Groups["app"].Value;
        env = match.Groups["env"].Value;
        return true;
    }
}