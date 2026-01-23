using System.Text.Json.Serialization;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Bootstrap.Models;

internal class BootstrapGlobalResponse
{
    /// <summary>
    /// Application metadata.
    /// </summary>
    [JsonPropertyName("applicationMetadata")]
    public required ApplicationMetadata ApplicationMetadata { get; set; }

    /// <summary>
    /// Footer layout configuration.
    /// </summary>
    [JsonPropertyName("footer")]
    public object? Footer { get; set; }

    /// <summary>
    /// Layout sets configuration.
    /// </summary>
    [JsonPropertyName("layoutSets")]
    public required LayoutSets LayoutSets { get; set; }

    /// <summary>
    /// FrontendSettings layout configuration.
    /// </summary>
    [JsonPropertyName("frontendSettings")]
    public object? FrontEndSettings { get; set; }

    /// <summary>
    /// Available language options.
    /// </summary>
    [JsonPropertyName("availableLanguages")]
    public List<ApplicationLanguage>? AvailableLanguages { get; set; }
}
