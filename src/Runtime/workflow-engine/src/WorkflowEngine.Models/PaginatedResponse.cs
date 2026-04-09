using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Generic cursor-paginated response wrapper.
/// Use <see cref="NextCursor"/> to fetch the next page. A null value indicates the last page.
/// </summary>
public sealed record PaginatedResponse<T>
{
    /// <summary>
    /// The items for the current page.
    /// </summary>
    [JsonPropertyName("data")]
    public required IReadOnlyList<T> Data { get; init; }

    /// <summary>
    /// The maximum number of items per page.
    /// </summary>
    [JsonPropertyName("pageSize")]
    public required int PageSize { get; init; }

    /// <summary>
    /// The total number of items matching the query (across all pages).
    /// </summary>
    [JsonPropertyName("totalCount")]
    public required int TotalCount { get; init; }

    /// <summary>
    /// Cursor to pass as <c>?cursor=</c> to retrieve the next page.
    /// Null when there are no more results.
    /// </summary>
    [JsonPropertyName("nextCursor")]
    public Guid? NextCursor { get; init; }
}
