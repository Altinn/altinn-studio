using Altinn.Augmenter.Agent.Models;

namespace Altinn.Augmenter.Agent.Pipelines;

public interface IPdfGenerationStep
{
    string Name { get; }

    /// <summary>
    /// Executes the step and returns zero or more produced files (PDF and/or DOCX).
    /// </summary>
    Task<IReadOnlyList<GeneratedPdf>> ExecuteAsync(
        IReadOnlyList<UploadedFile> files,
        CancellationToken cancellationToken = default);
}
