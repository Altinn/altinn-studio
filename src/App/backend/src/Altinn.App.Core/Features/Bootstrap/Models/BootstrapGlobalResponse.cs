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
    [JsonPropertyName("layoutSetsConfig")]
    public required LayoutSetsConfig LayoutSetsConfig { get; set; }

    /// <summary>
    /// FrontendSettings layout configuration.
    /// </summary>
    [JsonPropertyName("frontendSettings")]
    public object? FrontEndSettings { get; set; }
}
