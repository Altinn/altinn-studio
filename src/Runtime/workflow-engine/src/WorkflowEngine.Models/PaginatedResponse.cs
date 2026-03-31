using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Generic paginated response wrapper providing page metadata alongside the data.
/// </summary>
public sealed record PaginatedResponse<T>
{
    /// <summary>
    /// The items for the current page.
    /// </summary>
    [JsonPropertyName("data")]
    public required IReadOnlyList<T> Data { get; init; }

    /// <summary>
    /// The current page number (1-based).
    /// </summary>
    [JsonPropertyName("page")]
    public required int Page { get; init; }

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
    /// The total number of pages.
    /// </summary>
    [JsonPropertyName("totalPages")]
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}
