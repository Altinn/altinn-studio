using System.Text;
using System.Text.Json;
using Altinn.Augmenter.Agent.Models;

namespace Altinn.Augmenter.Agent.Services;

public sealed class ChecklistGenerationStep(
    IChecklistDataMapper dataMapper,
    IPdfGeneratorService pdfGenerator,
    ILogger<ChecklistGenerationStep> logger) : IPdfGenerationStep
{
    private const string TemplatePath = "pdf-templates/checklist/sjekkliste.typ";

    public string Name => "checklist";

    public async Task<GeneratedPdf?> ExecuteAsync(
        IReadOnlyList<UploadedFile> files,
        CancellationToken cancellationToken = default)
    {
        var jsonFile = files.FirstOrDefault(f => f.ContentType == "application/json");
        if (jsonFile == null)
        {
            logger.LogWarning("No JSON file found in uploaded files, skipping {StepName} step", Name);
            return null;
        }

        var jsonString = Encoding.UTF8.GetString(jsonFile.Data);
        using var doc = JsonDocument.Parse(jsonString);

        var flatData = doc.RootElement.TryGetProperty("FlatData", out var fd)
            ? fd
            : doc.RootElement;

        using var mappedData = dataMapper.MapToChecklist(flatData);
        var pdfBytes = await pdfGenerator.GeneratePdfAsync(mappedData, TemplatePath, cancellationToken);

        return new GeneratedPdf("checklist.pdf", pdfBytes);
    }
}
