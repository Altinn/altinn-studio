using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Response returned when a workflow is accepted for processing.
/// </summary>
public sealed record WorkflowAcceptedResponse([property: JsonPropertyName("workflowId")] long WorkflowId);
