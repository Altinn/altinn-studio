using Altinn.Augmenter.Agent.Models;

namespace Altinn.Augmenter.Agent.Pipelines;

public interface IPdfPipeline
{
    Task<IReadOnlyList<GeneratedPdf>> ExecuteAsync(
        IReadOnlyList<UploadedFile> files,
        CancellationToken cancellationToken = default);
}
