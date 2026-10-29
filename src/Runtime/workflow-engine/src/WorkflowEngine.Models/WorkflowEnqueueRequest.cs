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
    /// Opaque context passed to command handlers at execution time.
    /// Applied to all workflows in this batch. The engine never inspects this.
    /// </summary>
    [JsonPropertyName("context")]
    public JsonElement? Context { get; init; }

    /// <summary>
    /// The workflows to enqueue.
    /// </summary>
    [JsonPropertyName("workflows")]
    public required IReadOnlyList<WorkflowRequest> Workflows { get; init; }

    /// <summary>
    /// The fingerprint an idempotency key is checked against. A replay with the same key and the same fingerprint
    /// returns the original workflows, and a different fingerprint is a conflict. The fingerprint covers what the
    /// engine runs and indexes, and leaves out what it only carries for others:
    /// <list type="bullet">
    ///   <item><see cref="Context"/>. The engine never inspects it, and a caller may rebuild it per attempt, such
    ///   as a fresh auth token with a new issued-at.</item>
    ///   <item>Each step's <see cref="StepRequest.Labels"/>. The engine stores them for its readers and never
    ///   queries them, so a caller may rename what it shows for a step between an enqueue whose response was lost
    ///   and the replay, and the replay still finds the workflow it already has.</item>
    /// </list>
    /// Workflow <see cref="Labels"/> stay in. The engine indexes them, and callers read them back to decide what a
    /// workflow was for, so a key reused with other workflow labels is a different request.
    /// </summary>
    internal byte[] ComputeHash()
    {
        var fingerprint = this with
        {
            Context = null,
            Workflows = Workflows
                .Select(workflow =>
                    workflow with
                    {
                        Steps = workflow.Steps.Select(step => step with { Labels = null }).ToList(),
                    }
                )
                .ToList(),
        };
        return SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(fingerprint));
    }
}
