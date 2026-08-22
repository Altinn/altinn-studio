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

    /// <summary>
    /// Form data elements (those with AppLogic.ClassRef), not binary attachments.
    /// </summary>
    [JsonPropertyName("formData")]
    public required List<FormDataEntry> FormData { get; init; }

    /// <summary>
    /// The mailbox a service task's declaring stage opened, once it has opened one — the app's own bookkeeping
    /// riding the blob rather than anything the engine reads. <c>null</c> for every workflow that has not opened a
    /// mailbox.
    /// </summary>
    /// <remarks>
    /// The mailbox is minted under the declaring stage's engine-assigned step id, and no later step can re-derive
    /// that key. The blob is the only channel between steps of one workflow, so the id travels here: written when
    /// the stage mints, carried unchanged by every step in between, and read by the step that enqueues the first
    /// receive workflow. Absent from blobs written before mailboxes existed, which deserialize to <c>null</c>.
    /// </remarks>
    [JsonPropertyName("mailboxId")]
    public Guid? MailboxId { get; init; }
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
