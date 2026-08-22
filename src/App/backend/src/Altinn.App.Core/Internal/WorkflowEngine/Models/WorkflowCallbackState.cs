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
    /// The mailboxes a service task's declaring stages have opened, keyed by the stage that opened each — the
    /// app's own bookkeeping riding the blob rather than anything the engine reads. <c>null</c> for every
    /// workflow that has not opened a mailbox.
    /// </summary>
    /// <remarks>
    /// A mailbox is minted under its declaring stage's engine-assigned step id, and no later step can re-derive
    /// that key. The blob is the only channel between steps of one workflow, so the mailbox travels here:
    /// written when it is minted, carried unchanged by every step in between, and read by the step that
    /// enqueues the first receive workflow. Keyed by stage name rather than held as a single value so a task
    /// that opens more than one exchange needs no blob-format change against in-flight workflows. Absent from
    /// blobs written before mailboxes existed, which deserialize to <c>null</c>.
    /// </remarks>
    [JsonPropertyName("mailboxes")]
    public IReadOnlyDictionary<string, CarriedMailbox>? Mailboxes { get; init; }
}

/// <summary>
/// One mailbox as it travels between the steps of a workflow: the id later steps address it by, and the
/// deadline the declaring stage publishes alongside it.
/// </summary>
internal sealed record CarriedMailbox
{
    [JsonPropertyName("id")]
    public required Guid Id { get; init; }

    [JsonPropertyName("deadline")]
    public required DateTimeOffset Deadline { get; init; }
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
