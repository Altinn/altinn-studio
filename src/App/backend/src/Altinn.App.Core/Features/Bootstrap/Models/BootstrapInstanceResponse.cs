using System.Text.Json.Serialization;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Bootstrap.Models;

/// <summary>
/// Represents the aggregated initial data required for application bootstrap.
/// </summary>
public sealed class BootstrapInstanceResponse
{
    /// <summary>
    /// Current instance data if applicable.
    /// </summary>
    [JsonPropertyName("instance")]
    public Instance Instance { get; set; }

    /// <summary>
    /// Layout sets if available.
    /// </summary>
    [JsonPropertyName("layoutSets")]
    public LayoutSets LayoutSets { get; set; }

    /// <summary>
    /// Initial layout if applicable.
    /// </summary>
    [JsonPropertyName("layout")]
    public object Layout { get; set; }
}
