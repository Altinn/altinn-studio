namespace Altinn.Studio.StudioctlServer.Platform;

internal static class EnvironmentValues
{
    public static bool IsTruthy(string? value) =>
        string.Equals(value, "1", StringComparison.Ordinal)
        || string.Equals(value, "true", StringComparison.OrdinalIgnoreCase);
}
