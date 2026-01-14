namespace StudioGateway.Api.Settings;

internal static class AltinnEnvironments
{
    private static readonly string[] ProdNames = ["prod", "production"];

    public static bool IsProd(string environment) =>
        ProdNames.Contains(environment, StringComparer.OrdinalIgnoreCase);

    public static bool IsTest(string environment) =>
        environment.Equals("tt02", StringComparison.OrdinalIgnoreCase);
}
