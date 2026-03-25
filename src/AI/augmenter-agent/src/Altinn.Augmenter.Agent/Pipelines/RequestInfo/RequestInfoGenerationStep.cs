using System.Text;
using System.Text.Json;
using Altinn.Augmenter.Agent.Models;
using Altinn.Augmenter.Agent.Pipelines;

namespace Altinn.Augmenter.Agent.Pipelines.RequestInfo;

public sealed class RequestInfoGenerationStep(
    IRequestInfoDataMapper dataMapper,
    IPdfGeneratorService pdfGenerator,
    ILogger<RequestInfoGenerationStep> logger) : IPdfGenerationStep
{
    private const string TemplatePath = "Pipelines/RequestInfo/Templates/request-info.typ";

    public string Name => "request-info";

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

        using var mappedData = dataMapper.MapToRequestInfo(flatData);
        var pdfBytes = await pdfGenerator.GeneratePdfAsync(mappedData, TemplatePath, cancellationToken);

        return new GeneratedPdf("request-info.pdf", pdfBytes);
    }
}
