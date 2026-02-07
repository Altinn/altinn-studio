namespace Altinn.Augmenter.Agent.Models;

public sealed record ParsedFormData(List<UploadedFile> Files, string? CallbackUrl);
