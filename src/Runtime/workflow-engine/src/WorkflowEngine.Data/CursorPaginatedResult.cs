using WorkflowEngine.Models;

namespace WorkflowEngine.Data;

/// <summary>
/// Result of a cursor-paginated workflow query.
/// <paramref name="NextCursor"/> is the ID to pass as the cursor for the next page, or null if there are no more results.
/// <paramref name="TotalCount"/> is populated only when the caller requests it (requires a separate COUNT query).
/// </summary>
internal sealed record CursorPaginatedResult(
    IReadOnlyList<Workflow> Workflows,
    Guid? NextCursor,
    int? TotalCount = null
);
