using System.Text.Json.Serialization;

namespace Altinn.Studio.Cli.Upgrade.Next.IndexMigration;

/// <summary>
/// Configuration model for frontend.json
/// </summary>
internal sealed class FrontendConfiguration
{
    /// <summary>
    /// External stylesheet assets with their attributes
    /// </summary>
    [JsonPropertyName("stylesheets")]
    public List<FrontendAsset> Stylesheets { get; init; } = [];

    /// <summary>
    /// External script assets with their attributes
    /// </summary>
    [JsonPropertyName("scripts")]
    public List<FrontendAsset> Scripts { get; init; } = [];

    /// <summary>
    /// Whether the configuration has any content
    /// </summary>
    [JsonIgnore]
    public bool HasContent => Stylesheets.Count > 0 || Scripts.Count > 0;
}

/// <summary>
/// Represents a frontend asset (script or stylesheet) with its attributes
/// </summary>
internal sealed class FrontendAsset
{
    /// <summary>
    /// URL of the asset (src for scripts, href for stylesheets)
    /// </summary>
    [JsonPropertyName("url")]
    public required string Url { get; init; }

    /// <summary>
    /// Script type attribute (e.g., "module")
    /// </summary>
    [JsonPropertyName("type")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Type { get; init; }

    /// <summary>
    /// Whether the script has the async attribute
    /// </summary>
    [JsonPropertyName("async")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? Async { get; init; }

    /// <summary>
    /// Whether the script has the defer attribute
    /// </summary>
    [JsonPropertyName("defer")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? Defer { get; init; }

    /// <summary>
    /// Whether the script has the nomodule attribute
    /// </summary>
    [JsonPropertyName("nomodule")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? Nomodule { get; init; }

    /// <summary>
    /// Crossorigin attribute value
    /// </summary>
    [JsonPropertyName("crossorigin")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Crossorigin { get; init; }

    /// <summary>
    /// Integrity attribute value (Subresource Integrity hash)
    /// </summary>
    [JsonPropertyName("integrity")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Integrity { get; init; }

    /// <summary>
    /// Media query for stylesheets (e.g., "print", "screen and (max-width: 600px)")
    /// </summary>
    [JsonPropertyName("media")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Media { get; init; }
}
