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
    /// Footer layout configuration.
    /// </summary>
    [JsonPropertyName("applicationSettings")]
    public object? FrontEndSettings { get; set; }
}
