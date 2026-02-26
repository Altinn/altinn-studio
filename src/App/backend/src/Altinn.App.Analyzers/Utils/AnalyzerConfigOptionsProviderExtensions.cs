namespace Altinn.App.Analyzers;

public static class AnalyzerConfigOptionsProviderExtensions
{
    private const string IsAltinnAppProperty = "build_property.IsAltinnApp";

    public static bool IsAltinnApp(this AnalyzerConfigOptionsProvider provider)
    {
        return provider.GlobalOptions.TryGetValue(IsAltinnAppProperty, out var value)
            && string.Equals(value, "true", StringComparison.OrdinalIgnoreCase);
    }
}
