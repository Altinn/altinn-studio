namespace Altinn.Studio.Designer.Repository.Models;

public class ChatSourceEntity
{
    /// <summary>
    /// The MCP tool that produced this source (e.g. altinn_planning).
    /// </summary>
    public required string Tool { get; set; }

    /// <summary>
    /// Display title of the source page.
    /// </summary>
    public required string Title { get; set; }

    /// <summary>
    /// Short excerpt shown as a preview of the source content.
    /// </summary>
    public string? PreviewText { get; set; }

    /// <summary>
    /// Total character length of the source content.
    /// </summary>
    public int? ContentLength { get; set; }

    /// <summary>
    /// URL pointing to the original source.
    /// </summary>
    public string? Url { get; set; }

    /// <summary>
    /// Relevance score assigned by the retrieval system.
    /// </summary>
    public double? Relevance { get; set; }

    /// <summary>
    /// Terms from the query that matched this source.
    /// </summary>
    public string? MatchedTerms { get; set; }

    /// <summary>
    /// Whether the assistant cited this source in its response.
    /// </summary>
    public bool? Cited { get; set; }
}
