using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Cursor-paginated response for the collection list endpoint. Mirrors the shape of
/// <see cref="PaginatedResponse{T}"/>, with two collection-specific differences: the cursor is an
/// opaque string (collections are keyed by client-chosen keys, not GUIDs), and annotate-mode
/// requests additionally report <see cref="UnmatchedKeys"/>.
/// </summary>
public sealed record WorkflowCollectionListResponse
{
    /// <summary>
    /// The collections for the current page, in a stable, collation-defined key order (the order
    /// pagination walks; not necessarily ordinal).
    /// </summary>
    [JsonPropertyName("data")]
    public required IReadOnlyList<WorkflowCollectionResponse> Data { get; init; }

    /// <summary>
    /// The maximum number of items per page.
    /// </summary>
    [JsonPropertyName("pageSize")]
    public required int PageSize { get; init; }

    /// <summary>
    /// The total number of collections matching the query (across all pages).
    /// </summary>
    [JsonPropertyName("totalCount")]
    public required int TotalCount { get; init; }

    /// <summary>
    /// Opaque cursor to pass as <c>?cursor=</c> to retrieve the next page — do not parse or
    /// construct it. Null when there are no more results.
    /// </summary>
    [JsonPropertyName("nextCursor")]
    public string? NextCursor { get; init; }

    /// <summary>
    /// The requested collection keys that have no collection row, populated (possibly empty) only
    /// when the request supplied <c>?key=</c> filters. Absence of a row is deliberately
    /// distinguishable from a healthy collection: a key can be unmatched because it never existed
    /// <em>or</em> because the collection was purged by retention, and neither reading means
    /// "no failures".
    /// </summary>
    [JsonPropertyName("unmatchedKeys")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public IReadOnlyList<string>? UnmatchedKeys { get; init; }
}
