namespace Altinn.Augmenter.Agent.Models;

public sealed record PdfGenerationJob(
    string CallbackUrl,
    DateTime Timestamp,
    IReadOnlyList<UploadedFile> Files);
