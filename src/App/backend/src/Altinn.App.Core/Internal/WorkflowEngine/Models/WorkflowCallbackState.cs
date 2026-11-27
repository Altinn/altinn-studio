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
    public required int InstanceVersion { get; init; }

    [JsonPropertyName("processStateVersion")]
    public required int ProcessStateVersion { get; init; }

    /// <summary>
    /// Form data elements (those with AppLogic.ClassRef), not binary attachments.
    /// </summary>
    [JsonPropertyName("formData")]
    public required List<FormDataEntry> FormData { get; init; }

    /// <summary>
    /// The mailbox a service task's external stage has open, keyed by the stage's item index as a string (JSON
    /// object keys are strings) — the app's own bookkeeping riding the blob rather than anything the engine reads.
    /// <c>null</c> for every workflow with no mailbox open. A service task opens one at a time, so the map holds one
    /// entry at most.
    /// </summary>
    /// <remarks>
    /// A mailbox is minted under its mint step's engine-assigned step id, and no later step can re-derive that
    /// key. The blob is the only channel between steps, so the mailbox travels here: written when it is minted,
    /// read by the send and by the step that enqueues the first receive workflow, and dropped when it closes.
    /// Absent from blobs written before mailboxes existed, which deserialize to <c>null</c>.
    /// </remarks>
    [JsonPropertyName("mailboxes")]
    public IReadOnlyDictionary<string, CarriedMailbox>? Mailboxes { get; init; }
}

/// <summary>
/// One mailbox as it travels between the steps of a workflow: the id later steps address it by, and the
/// deadline the external stage's send publishes alongside it.
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
