namespace Altinn.App.Core.Features;

/// <summary>
/// Class representing active feature flag constants.
/// New featurew flags should be defined here with a name equal it's value
/// to avoid the use of string based feature flags.
/// </summary>
public static class FeatureFlags
{
    /// <summary>
    /// By enabling this feature calling the POST on the /data endpoints will
    /// return validation errors in the response body instead of a string.
    /// </summary>
    public const string JsonObjectInDataResponse = "JsonObjectInDataResponse";

    /// <summary>
    /// Enables new PDF generation
    /// </summary>
    public const string BetaPDFenabled = "BetaPDFenabled";

    /// <summary>
    /// Enables adding instance identifier to layout requests.
    /// </summary>
    public const string AddInstanceIdentifierToLayoutRequests = "addInstanceIdentifierToLayoutRequests";

    /// <summary>
    /// Enables experimental SimpleTable component
    /// </summary>
    public const string SimpleTableEnabled = "SimpleTableEnabled";
}
