using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models;

/// <summary>
/// Internal DTO representing transported workflow callback state.
/// The workflow engine never inspects this — it's serialized into an opaque string.
/// </summary>
internal sealed record WorkflowCallbackState
{
    [JsonPropertyName("instance")]
    public required Instance Instance { get; init; }

    [JsonPropertyName("instanceVersion")]
    public int? InstanceVersion { get; init; }

    [JsonPropertyName("processStateVersion")]
    public int? ProcessStateVersion { get; init; }

    /// <summary>
    /// Form data elements (those with AppLogic.ClassRef), not binary attachments.
    /// </summary>
    [JsonPropertyName("formData")]
    public required List<FormDataEntry> FormData { get; init; }
}

/// <summary>
/// A single form data entry in the transported state.
/// </summary>
internal sealed record FormDataEntry
{
    [JsonPropertyName("id")]
    public required string Id { get; init; }

    [JsonPropertyName("dataType")]
    public required string DataType { get; init; }

    [JsonPropertyName("data")]
    public required JsonElement Data { get; init; }
}
