namespace Altinn.Augmenter.Agent.Models;

public sealed record ParsedFormData(IReadOnlyList<UploadedFile> Files, string? CallbackUrl);
