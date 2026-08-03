namespace Altinn.Studio.Designer.Repository.Models;

public class ChatSourceEntity
{
    /// <summary>
    /// Display title of the source (docs page title, skill name, schema label).
    /// </summary>
    public required string Title { get; set; }

    /// <summary>
    /// URL pointing to the original source, when it has one.
    /// </summary>
    public string? Url { get; set; }

    /// <summary>
    /// Source category from the agent: "docs", "skill" or "schema".
    /// </summary>
    public string? Kind { get; set; }

    /// <summary>
    /// The MCP tool that produced this source. Legacy field from the retired
    /// retrieval pipeline — still present on messages persisted before the
    /// agentic-loop architecture.
    /// </summary>
    public string? Tool { get; set; }

    /// <summary>
    /// Short excerpt shown as a preview of the source content. Legacy field.
    /// </summary>
    public string? PreviewText { get; set; }

    /// <summary>
    /// Total character length of the source content. Legacy field.
    /// </summary>
    public int? ContentLength { get; set; }

    /// <summary>
    /// Relevance score assigned by the retrieval system. Legacy field.
    /// </summary>
    public double? Relevance { get; set; }

    /// <summary>
    /// Terms from the query that matched this source. Legacy field.
    /// </summary>
    public string? MatchedTerms { get; set; }

    /// <summary>
    /// Whether the assistant cited this source in its response. Legacy field.
    /// </summary>
    public bool? Cited { get; set; }
}
