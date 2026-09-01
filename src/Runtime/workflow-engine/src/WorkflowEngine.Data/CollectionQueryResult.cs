using WorkflowEngine.Models;

namespace WorkflowEngine.Data;

/// <summary>
/// Result of a cursor-paginated collection query.
/// <paramref name="NextCursor"/> is the last collection key of the page, to pass as the cursor for
/// the next page, or null if there are no more results.
/// <paramref name="TotalCount"/> is the total number of collections matching the query across all pages.
/// <paramref name="UnmatchedKeys"/> holds the requested keys with no collection row, and is non-null
/// (possibly empty) only for key-filtered (annotate) queries.
/// </summary>
internal sealed record CollectionQueryResult(
    IReadOnlyList<WorkflowCollectionResponse> Collections,
    string? NextCursor,
    int TotalCount,
    IReadOnlyList<string>? UnmatchedKeys = null
);
