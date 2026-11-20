using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// Whether the process waits on a workflow, as the engine derives it from the workflow's <c>isHead</c>
/// directive. A primary workflow is one the process waits on. An auxiliary workflow runs beside the
/// process: it never blocks or moves it, and its failure means work was lost and must be redriven,
/// not that the instance is stuck.
/// </summary>
[JsonConverter(typeof(TolerantEnumConverter<WorkflowRole>))]
internal enum WorkflowRole
{
    /// <summary>
    /// A role this version does not know, which a newer engine sent. The app's own member, never on the wire. The
    /// process waits on a workflow that has it, as on a primary one. Reading it as auxiliary could let a transition
    /// settle while that workflow still runs.
    /// </summary>
    Unknown = -1,

    /// <summary>
    /// The process waits on this workflow: its <c>isHead</c> directive is <c>true</c> or unset.
    /// </summary>
    Primary = 0,

    /// <summary>
    /// The workflow runs beside the process: its <c>isHead</c> directive is <c>false</c>.
    /// </summary>
    Auxiliary = 1,
}
