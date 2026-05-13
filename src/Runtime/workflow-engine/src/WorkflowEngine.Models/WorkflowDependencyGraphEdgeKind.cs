using System.Text.Json.Serialization;
using WorkflowEngine.Resilience.JsonConverters;

namespace WorkflowEngine.Models;

/// <summary>
/// The kind of relationship represented by a <see cref="WorkflowDependencyGraphEdgeResponse"/>.
/// </summary>
[JsonConverter(typeof(FlexibleEnumConverter<WorkflowDependencyGraphEdgeKind>))]
public enum WorkflowDependencyGraphEdgeKind
{
    /// <summary>
    /// The <c>From</c> workflow must complete before the <c>To</c> workflow can run.
    /// </summary>
    Dependency = 0,

    /// <summary>
    /// The <c>From</c> workflow declares a non-blocking link to the <c>To</c> workflow.
    /// </summary>
    Link = 1,
}
