using System.Diagnostics;
using System.Text.Json;

namespace WorkflowEngine.Models;

/// <summary>
/// Everything a command handler needs to execute a step.
/// </summary>
public sealed record CommandExecutionContext
{
    /// <summary>The parent workflow.</summary>
    public required Workflow Workflow { get; init; }

    /// <summary>The step being executed.</summary>
    public required Step Step { get; init; }

    /// <summary>The opaque command configuration (from <see cref="Command.Data"/>).</summary>
    public JsonElement? CommandData { get; init; }

    /// <summary>State output from the previous step (or <see cref="Workflow.InitialState"/> for the first step).</summary>
    public string? StateIn { get; init; }

    /// <summary>Parent trace context for distributed tracing.</summary>
    public ActivityContext? ParentTraceContext { get; init; }
}
