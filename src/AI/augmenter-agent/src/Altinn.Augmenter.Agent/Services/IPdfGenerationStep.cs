using Altinn.Augmenter.Agent.Models;

namespace Altinn.Augmenter.Agent.Services;

public interface IPdfGenerationStep
{
    string Name { get; }

    Task<GeneratedPdf?> ExecuteAsync(
        IReadOnlyList<UploadedFile> files,
        CancellationToken cancellationToken = default);
}
