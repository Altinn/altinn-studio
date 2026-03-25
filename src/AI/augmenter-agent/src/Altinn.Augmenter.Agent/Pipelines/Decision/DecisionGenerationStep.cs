using System.Text;
using System.Text.Json;
using Altinn.Augmenter.Agent.Models;
using Altinn.Augmenter.Agent.Pipelines;

namespace Altinn.Augmenter.Agent.Pipelines.Decision;

public sealed class DecisionGenerationStep(
    IDecisionDataMapper dataMapper,
    IPdfGeneratorService pdfGenerator,
    ILogger<DecisionGenerationStep> logger) : IPdfGenerationStep
{
    private const string TemplatePath = "Pipelines/Decision/Templates/vedtak.typ";

    public string Name => "decision";

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

        using var mappedData = dataMapper.MapToDecision(flatData);
        var pdfBytes = await pdfGenerator.GeneratePdfAsync(mappedData, TemplatePath, cancellationToken);

        return new GeneratedPdf("vedtak.pdf", pdfBytes);
    }
}
