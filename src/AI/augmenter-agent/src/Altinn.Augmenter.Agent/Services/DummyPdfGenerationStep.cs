using System.Text.Json;
using Altinn.Augmenter.Agent.Models;

namespace Altinn.Augmenter.Agent.Services;

public sealed class DummyPdfGenerationStep(
    string name,
    string templatePath,
    IPdfGeneratorService pdfGenerator) : IPdfGenerationStep
{
    public string Name => name;

    public async Task<GeneratedPdf?> ExecuteAsync(
        IReadOnlyList<UploadedFile> files,
        CancellationToken cancellationToken = default)
    {
        using var stream = new MemoryStream();
        using (var writer = new Utf8JsonWriter(stream))
        {
            writer.WriteStartObject();
            writer.WriteString("timestamp", DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss"));
            writer.WriteString("step", name);
            writer.WriteEndObject();
        }

        stream.Position = 0;
        using var data = JsonDocument.Parse(stream);

        var pdfBytes = await pdfGenerator.GeneratePdfAsync(data, templatePath, cancellationToken);
        return new GeneratedPdf($"{name}.pdf", pdfBytes);
    }
}
