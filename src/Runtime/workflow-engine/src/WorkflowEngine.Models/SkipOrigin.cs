#pragma warning disable CA1008 // No zero member — the column is nullable, and null is the one "not skipped" value

namespace WorkflowEngine.Models;

/// <summary>
/// Who caused a skip: the command's own outcome, or a manual skip through the skip endpoint. Recorded beside
/// <see cref="Step.SkipReason"/>, which is a machine-readable code in the first case and free text in the second.
/// </summary>
public enum SkipOrigin
{
    /// <summary>
    /// The step's command returned <see cref="ExecutionStatus.Skipped"/>.
    /// </summary>
    Command = 1,

    /// <summary>
    /// An operator skipped the workflow through the skip endpoint. Named after the metric tag
    /// (<c>reason = manual</c>).
    /// </summary>
    Manual = 2,
}
