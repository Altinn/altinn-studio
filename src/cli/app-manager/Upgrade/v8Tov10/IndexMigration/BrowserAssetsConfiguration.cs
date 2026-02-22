using System.Text.Json.Serialization;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.IndexMigration;

/// <summary>
/// Configuration model for assets.json
/// </summary>
internal sealed class BrowserAssetsConfiguration
{
    /// <summary>
    /// External stylesheet assets with their attributes
    /// </summary>
    [JsonPropertyName("stylesheets")]
    public List<BrowserStylesheet> Stylesheets { get; init; } = [];

    /// <summary>
    /// External script assets with their attributes
    /// </summary>
    [JsonPropertyName("scripts")]
    public List<BrowserScript> Scripts { get; init; } = [];

    /// <summary>
    /// Whether the configuration has any content
    /// </summary>
    [JsonIgnore]
    public bool HasContent => Stylesheets.Count > 0 || Scripts.Count > 0;
}

/// <summary>
/// Script type attribute values
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter<BrowserScriptType>))]
internal enum BrowserScriptType
{
    /// <summary>
    /// ES module script
    /// </summary>
    [JsonStringEnumMemberName("module")]
    Module,
}

/// <summary>
/// Base class for browser assets included in the generated HTML
/// </summary>
internal abstract class BrowserAsset
{
    /// <summary>
    /// URL of the asset (src for scripts, href for stylesheets)
    /// </summary>
    [JsonPropertyName("url")]
    public required string Url { get; init; }

    /// <summary>
    /// Whether the asset has crossorigin="anonymous" attribute
    /// </summary>
    [JsonPropertyName("crossorigin")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool Crossorigin { get; init; }

    /// <summary>
    /// Integrity attribute value (Subresource Integrity hash)
    /// </summary>
    [JsonPropertyName("integrity")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Integrity { get; init; }
}

/// <summary>
/// Represents a script asset included in the generated HTML
/// </summary>
internal sealed class BrowserScript : BrowserAsset
{
    /// <summary>
    /// Script type attribute (only "module" is supported)
    /// </summary>
    [JsonPropertyName("type")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public BrowserScriptType? Type { get; init; }

    /// <summary>
    /// Whether the script has the async attribute
    /// </summary>
    [JsonPropertyName("async")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool Async { get; init; }

    /// <summary>
    /// Whether the script has the defer attribute
    /// </summary>
    [JsonPropertyName("defer")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool Defer { get; init; }

    /// <summary>
    /// Whether the script has the nomodule attribute
    /// </summary>
    [JsonPropertyName("nomodule")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool Nomodule { get; init; }
}

/// <summary>
/// Represents a stylesheet asset included in the generated HTML
/// </summary>
internal sealed class BrowserStylesheet : BrowserAsset
{
    /// <summary>
    /// Media query for stylesheets (e.g., "print", "screen and (max-width: 600px)")
    /// </summary>
    [JsonPropertyName("media")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Media { get; init; }
}
