using Altinn.Augmenter.Agent.Models;

namespace Altinn.Augmenter.Agent.Pipelines;

public sealed class PdfPipeline(
    IEnumerable<IPdfGenerationStep> steps,
    ILogger<PdfPipeline> logger) : IPdfPipeline
{
    public async Task<IReadOnlyList<GeneratedPdf>> ExecuteAsync(
        IReadOnlyList<UploadedFile> files,
        CancellationToken cancellationToken = default)
    {
        var results = new List<GeneratedPdf>();

        foreach (var step in steps)
        {
            try
            {
                logger.LogInformation("Running PDF generation step: {StepName}", step.Name);
                var result = await step.ExecuteAsync(files, cancellationToken);

                if (result != null)
                {
                    results.Add(result);
                    logger.LogInformation(
                        "Step {StepName} produced PDF: {PdfName} ({Size} bytes)",
                        step.Name, result.Name, result.Data.Length);
                }
                else
                {
                    logger.LogWarning("Step {StepName} produced no output", step.Name);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Step {StepName} failed", step.Name);
            }
        }

        return results;
    }
}
