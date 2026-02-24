namespace Altinn.Augmenter.Agent.Configuration;

public sealed class UploadOptions
{
    public const string SectionName = "Upload";
    public long MaxFileBytes { get; set; } = 10 * 1024 * 1024;   // 10 MB per file
    public long MaxTotalBytes { get; set; } = 50 * 1024 * 1024;  // 50 MB total
}
