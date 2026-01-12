using System.Text.Json.Serialization;

namespace Altinn.Studio.Cli.Upgrade.Next.IndexMigration;

/// <summary>
/// Configuration model for frontend.json
/// </summary>
internal sealed class FrontendConfiguration
{
    /// <summary>
    /// External stylesheet URLs
    /// </summary>
    [JsonPropertyName("stylesheets")]
    public List<string> Stylesheets { get; init; } = [];

    /// <summary>
    /// External script URLs
    /// </summary>
    [JsonPropertyName("scripts")]
    public List<string> Scripts { get; init; } = [];

    /// <summary>
    /// Whether the configuration has any content
    /// </summary>
    [JsonIgnore]
    public bool HasContent => Stylesheets.Count > 0 || Scripts.Count > 0;
}
