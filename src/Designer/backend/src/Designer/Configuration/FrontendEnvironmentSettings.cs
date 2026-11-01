using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration;

/// <summary>
/// Values the frontend reads at runtime from <c>/designer/config/env.json</c>. They are public: every browser that
/// loads Designer receives them.
/// </summary>
public class FrontendEnvironmentSettings : ISettingsMarker
{
    /// <summary>
    /// Connection string for the frontend's Application Insights telemetry.
    /// </summary>
    public string? AiConnectionString { get; set; }

    /// <summary>
    /// Project API key for the frontend's PostHog analytics.
    /// </summary>
    public string? PostHogApiKey { get; set; }

    /// <summary>
    /// Host that the frontend sends PostHog analytics to.
    /// </summary>
    public string? PostHogApiHost { get; set; }
}
