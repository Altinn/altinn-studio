namespace Altinn.Augmenter.Agent.Services;

public interface IPdfGeneratorService
{
    // TODO: Accept uploaded files (IReadOnlyList<FormFile>) for inclusion in generated PDFs.
    Task<byte[]> GeneratePdfAsync(DateTime timestamp, CancellationToken cancellationToken = default);
}
