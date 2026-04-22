namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public class ChatSourceDbModel
{
    public required string Tool { get; set; }
    public required string Title { get; set; }
    public string? PreviewText { get; set; }
    public int? ContentLength { get; set; }
    public string? Url { get; set; }
    public double? Relevance { get; set; }
    public string? MatchedTerms { get; set; }
    public bool? Cited { get; set; }
}
