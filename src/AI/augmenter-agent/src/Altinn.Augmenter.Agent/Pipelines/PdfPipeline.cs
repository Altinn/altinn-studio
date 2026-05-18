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
                var stepResults = await step.ExecuteAsync(files, cancellationToken);

                foreach (var result in stepResults)
                {
                    results.Add(result);
                    logger.LogInformation(
                        "Step {StepName} produced: {FileName} ({Size} bytes)",
                        step.Name, result.Name, result.Data.Length);
                }

                if (stepResults.Count == 0)
                    logger.LogWarning("Step {StepName} produced no output", step.Name);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Step {StepName} failed", step.Name);
            }
        }

        return results;
    }
}
