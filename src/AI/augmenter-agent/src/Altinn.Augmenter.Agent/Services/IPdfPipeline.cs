using Altinn.Augmenter.Agent.Models;

namespace Altinn.Augmenter.Agent.Services;

public interface IPdfPipeline
{
    Task<IReadOnlyList<GeneratedPdf>> ExecuteAsync(
        IReadOnlyList<UploadedFile> files,
        CancellationToken cancellationToken = default);
}
