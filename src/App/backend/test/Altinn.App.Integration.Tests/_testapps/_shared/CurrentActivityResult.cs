namespace TestApp.Shared;

internal sealed class CurrentActivityResult
{
    public string? TraceId { get; set; }
    public string? SpanId { get; set; }
    public string? ParentSpanId { get; set; }
    public string? ParentId { get; set; }
    public bool? Recorded { get; set; }
    public bool? IsAllDataRequested { get; set; }
}
