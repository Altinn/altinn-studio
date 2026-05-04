namespace Altinn.Augmenter.Agent.Configuration;

public sealed class PdfGenerationOptions
{
    public const string SectionName = "PdfGeneration";
    public int ProcessTimeoutSeconds { get; set; } = 60;
    public string TemplatePath { get; set; } = "pdf-templates/default.typ";
}
