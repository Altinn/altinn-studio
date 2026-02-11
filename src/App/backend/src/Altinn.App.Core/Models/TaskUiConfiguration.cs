namespace Altinn.App.Core.Models;

/// <summary>
/// Resolved task UI configuration for runtime use.
/// </summary>
public class TaskUiConfiguration
{
    /// <summary>
    /// The process task id.
    /// </summary>
    public required string TaskId { get; init; }

    /// <summary>
    /// The ui folder id containing layouts/settings for the task.
    /// </summary>
    public required string FolderId { get; init; }

    /// <summary>
    /// The resolved default data type id, or null if not resolvable.
    /// </summary>
    public string? DefaultDataType { get; init; }
}
