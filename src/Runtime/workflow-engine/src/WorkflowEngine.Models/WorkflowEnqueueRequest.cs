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

    // A null field is left out, so a nullable field added to the request later does not change the hash of
    // requests that leave it unset.
    private static readonly JsonSerializerOptions _fingerprintOptions = new()
    {
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
    /// <param name="collectionKey">The collection key the request was sent with, or null.</param>
    internal byte[] ComputeHash(string? collectionKey)
    {
        var work = this with
        {
            Labels = null,
            Context = null,
            Workflows = Workflows
                .Select(workflow =>
                    workflow with
                    {
                        State = null,
                        Steps = workflow.Steps.Select(step => step with { Labels = null }).ToList(),
                    }
                )
                .ToList(),
        };
        return SHA256.HashData(
            JsonSerializer.SerializeToUtf8Bytes(new Fingerprint(collectionKey, work), _fingerprintOptions)
        );
    }

    private sealed record Fingerprint(string? CollectionKey, WorkflowEnqueueRequest Work);
}
