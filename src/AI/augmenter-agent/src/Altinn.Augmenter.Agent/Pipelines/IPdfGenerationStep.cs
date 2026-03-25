using Altinn.Augmenter.Agent.Models;

namespace Altinn.Augmenter.Agent.Pipelines;

public interface IPdfGenerationStep
{
    string Name { get; }

    Task<GeneratedPdf?> ExecuteAsync(
        IReadOnlyList<UploadedFile> files,
        CancellationToken cancellationToken = default);
}
