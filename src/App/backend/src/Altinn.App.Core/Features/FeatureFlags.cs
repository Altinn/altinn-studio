namespace Altinn.App.Core.Features;

/// <summary>
/// Class representing active feature flag constants.
/// New featurew flags should be defined here with a name equal it's value
/// to avoid the use of string based feature flags.
/// </summary>
public static class FeatureFlags
{
    /// <summary>
    /// Enables adding instance identifier to layout requests.
    /// </summary>
    public const string AddInstanceIdentifierToLayoutRequests = "addInstanceIdentifierToLayoutRequests";

    /// <summary>
    /// Enables experimental SimpleTable component
    /// </summary>
    public const string SimpleTableEnabled = "SimpleTableEnabled";
}
