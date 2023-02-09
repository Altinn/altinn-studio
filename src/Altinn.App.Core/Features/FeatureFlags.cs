namespace Altinn.App.Core.Features;

/// <summary>
/// Class representing active feature flag constants.
/// New featurew flags should be defined here with a name equal it's value
/// to avoid the use of string based feature flags.
/// </summary>
public static class FeatureFlags
{
    /// <summary>
    /// By enabling this feature flag the application will use the new Chromium
    /// based solution for pdf generation.
    /// </summary>
    public const string NewPdfGeneration = "NewPdfGeneration";
}
