using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// A request to enqueue one or more workflows in a single batch.
/// </summary>
public sealed record WorkflowEnqueueRequest
{
    /// <summary>
    /// Indexed key-value pairs for filtering, grouping, and dashboard queries.
    /// Applied to all workflows in this batch.
    /// </summary>
    [JsonPropertyName("labels")]
    public Dictionary<string, string>? Labels { get; init; }

    /// <summary>
    /// Opaque context passed to the commands at execution time. Applied to all workflows in this batch. The engine
    /// does not interpret it, but hands it to each command that declares a context type, at enqueue for validation
    /// and at execution.
    /// </summary>
    [JsonPropertyName("context")]
    public JsonElement? Context { get; init; }

    /// <summary>
    /// The workflows to enqueue.
    /// </summary>
    [JsonPropertyName("workflows")]
    public required IReadOnlyList<WorkflowRequest> Workflows { get; init; }

    // A null field is left out, so selecting a nullable field later does not change the hash of requests that
    // leave it unset.
    private static readonly JsonSerializerOptions _fingerprintOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    /// <summary>
    /// The fingerprint an idempotency key is checked against: the same key with the same fingerprint returns the
    /// original workflows, and another fingerprint is a conflict. It covers the work, which is the collection the
    /// workflows join, the steps, their commands and options, the dependencies and the schedule. It leaves out the
    /// data the work runs on (<see cref="Context"/> and each workflow's <see cref="WorkflowRequest.State"/>) and the
    /// labels of workflows and steps. A caller may rebuild those per attempt, and the workflows keep the ones they
    /// were created with. The commands still validate the context before the fingerprint is checked, so a replay
    /// whose context a command rejects is invalid rather than a duplicate.
    /// </summary>
    /// <remarks>
    /// Only the fields of <see cref="Fingerprint"/>, <see cref="WorkflowFingerprint"/> and
    /// <see cref="StepFingerprint"/> are hashed. A field added to a request model changes no hash until it is added
    /// to one of them, which it should be only when another value means other work.
    /// </remarks>
    /// <param name="collectionKey">The collection key the request was sent with, or null.</param>
    internal byte[] ComputeHash(string? collectionKey)
    {
        var fingerprint = new Fingerprint(
            collectionKey,
            Workflows.Select(workflow => new WorkflowFingerprint(
                workflow.Ref,
                workflow.OperationId,
                workflow.Steps.Select(step => new StepFingerprint(step.OperationId, step.Command, step.RetryStrategy)),
                workflow.StartAt,
                workflow.DependsOn,
                workflow.Links,
                workflow.DependsOnHeads,
                workflow.IsHead,
                workflow.Mailbox
            ))
        );
        return SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(fingerprint, _fingerprintOptions));
    }

    internal sealed record Fingerprint(string? CollectionKey, IEnumerable<WorkflowFingerprint> Workflows);

    internal sealed record WorkflowFingerprint(
        string? Ref,
        string OperationId,
        IEnumerable<StepFingerprint> Steps,
        DateTimeOffset? StartAt,
        IEnumerable<WorkflowRef>? DependsOn,
        IEnumerable<WorkflowRef>? Links,
        bool DependsOnHeads,
        bool? IsHead,
        MailboxReference? Mailbox
    );

    internal sealed record StepFingerprint(string OperationId, CommandDefinition Command, RetryStrategy? RetryStrategy);
}
