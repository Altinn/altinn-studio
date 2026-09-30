namespace Altinn.Studio.Designer.Models.Dto;

public class SubformPdfComponentChange
{
    public required string TaskId { get; set; }
    public string? ComponentId { get; set; }
    public string? SourceLayoutSetId { get; set; }
    public string? PreviousComponentId { get; set; }
}
