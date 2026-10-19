using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Whether a workflow is one the process waits on, derived from its <see cref="Workflow.IsHead"/>
/// directive. A primary workflow is one the process waits on. An auxiliary workflow runs beside the
/// process: it never blocks or moves it, and its failure means work was lost and must be redriven,
/// not that the instance is stuck.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter<WorkflowRole>))]
public enum WorkflowRole
{
    /// <summary>
    /// The process waits on this workflow: its <c>isHead</c> directive is <c>true</c> or unset.
    /// </summary>
    [JsonStringEnumMemberName("primary")]
    Primary = 0,

    /// <summary>
    /// The workflow runs beside the process: its <c>isHead</c> directive is exactly <c>false</c>.
    /// </summary>
    [JsonStringEnumMemberName("auxiliary")]
    Auxiliary = 1,
}
