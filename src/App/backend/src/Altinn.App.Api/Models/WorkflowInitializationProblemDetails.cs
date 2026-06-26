using System.Text.Json.Serialization;
using Altinn.App.Core.Models.Process;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Models;

/// <summary>
/// <see cref="JsonStringEnumConverter"/> that emits camelCase member names, matching the casing used
/// for the rest of the JSON contract.
/// </summary>
internal sealed class JsonCamelCaseEnumConverter : JsonStringEnumConverter
{
    public JsonCamelCaseEnumConverter()
        : base(System.Text.Json.JsonNamingPolicy.CamelCase) { }
}

/// <summary>
/// The stage an instance/process reached when workflow initialization failed. Part of the wire contract.
/// </summary>
[JsonConverter(typeof(JsonCamelCaseEnumConverter))]
public enum WorkflowInitializationState
{
    /// <summary>The workflow engine rejected the submitted workflow.</summary>
    WorkflowNotAccepted,

    /// <summary>Runtime could not determine whether the workflow engine accepted the submission.</summary>
    WorkflowAcceptanceUnknown,

    /// <summary>The workflow engine accepted the workflow, but it failed during execution.</summary>
    WorkflowFailed,
}

/// <summary>
/// The action a client should take to recover from a workflow initialization failure. Part of the wire contract.
/// </summary>
[JsonConverter(typeof(JsonCamelCaseEnumConverter))]
public enum WorkflowRecommendedAction
{
    /// <summary>The created instance was cleaned up; the client can safely retry instance creation.</summary>
    RetryInstanceCreation,

    /// <summary>The existing instance was left untouched; the client can retry starting the process.</summary>
    RetryStartProcess,

    /// <summary>The client should inspect the instance and workflow state before deciding how to proceed.</summary>
    InspectInstance,

    /// <summary>The process state may have changed; the client should call the resume endpoint.</summary>
    ResumeCurrentTask,
}

/// <summary>
/// Hypermedia pointer to the process resume endpoint, surfaced so clients know where to recover
/// a workflow that failed after the process state may already have changed.
/// </summary>
public sealed record WorkflowResumeEndpoint(
    [property: JsonPropertyName("method")] string Method,
    [property: JsonPropertyName("path")] string Path
);

/// <summary>
/// Structured problem details returned when the workflow engine rejects or fails the initial process
/// workflow, for both instance creation and process start of an existing instance. Extends
/// <see cref="ProblemDetails"/> so the response remains valid <c>application/problem+json</c>; the
/// workflow-specific members are serialized alongside the standard ones and form a stable recovery
/// contract clients can react to.
/// </summary>
public sealed class WorkflowInitializationProblemDetails : ProblemDetails
{
    /// <summary>The stage initialization reached when it failed.</summary>
    [JsonPropertyName("initializationState")]
    public required WorkflowInitializationState InitializationState { get; init; }

    /// <summary>The recommended client recovery action.</summary>
    [JsonPropertyName("recommendedAction")]
    public required WorkflowRecommendedAction RecommendedAction { get; init; }

    /// <summary>Whether the created instance was deleted (instance creation flow only).</summary>
    [JsonPropertyName("instanceDeleted")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? InstanceDeleted { get; init; }

    /// <summary>Where to resume the process when the workflow failed after the state may have changed.</summary>
    [JsonPropertyName("resumeEndpoint")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public WorkflowResumeEndpoint? ResumeEndpoint { get; init; }

    /// <summary>Whether the workflow engine accepted the submission.</summary>
    [JsonPropertyName("workflowAccepted")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? WorkflowAccepted { get; init; }

    /// <summary>Structured detail about the workflow failure, when the workflow was accepted but failed.</summary>
    [JsonPropertyName("workflowFailure")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public WorkflowFailure? WorkflowFailure { get; init; }

    /// <summary>Why the submission was not accepted (submission failures only).</summary>
    [JsonPropertyName("workflowSubmissionFailureKind")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public WorkflowSubmissionFailureKind? WorkflowSubmissionFailureKind { get; init; }

    /// <summary>The HTTP status code the workflow engine returned when rejecting the submission, if known.</summary>
    [JsonPropertyName("workflowSubmissionStatusCode")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? WorkflowSubmissionStatusCode { get; init; }

    /// <summary>The workflow collection key, if known.</summary>
    [JsonPropertyName("workflowCollectionKey")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? WorkflowCollectionKey { get; init; }

    /// <summary>Whether the process state may have changed in Storage before the failure.</summary>
    [JsonPropertyName("processStateChanged")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? ProcessStateChanged { get; init; }

    /// <summary>The affected instance id, when an instance exists.</summary>
    [JsonPropertyName("instanceId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? InstanceId { get; init; }

    /// <summary>The affected instance owner party id, when an instance exists.</summary>
    [JsonPropertyName("instanceOwnerPartyId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? InstanceOwnerPartyId { get; init; }

    /// <summary>The affected instance guid, when an instance exists.</summary>
    [JsonPropertyName("instanceGuid")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Guid? InstanceGuid { get; init; }
}
