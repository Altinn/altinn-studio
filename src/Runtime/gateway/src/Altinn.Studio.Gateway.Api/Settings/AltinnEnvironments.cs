namespace Altinn.Studio.Gateway.Api.Settings;

internal static class AltinnEnvironments
{
    public const string Prod = "prod";
    public const string Production = "production";
    private static readonly string[] _prodNames = [Prod, Production];

    public static bool IsProd(string environment) => _prodNames.Contains(environment, StringComparer.OrdinalIgnoreCase);

    public static bool IsTT02(string environment) => environment.Equals("tt02", StringComparison.OrdinalIgnoreCase);
}
