namespace Altinn.Studio.Designer.Configuration;

public class CustomTemplateSettings
{
    public string DefaultTemplateOrganization { get; set; } = "als";
    public TemplateCacheSettings Cache { get; set; } = new();
    public LockSettings Lock { get; set; } = new();
}

public class TemplateCacheSettings
{
    public string LocalCacheFolder { get; set; } = ".template-cache";
    public string MetadataFileName { get; set; } = ".cache-info.json";

    public int ExpirationDays { get; set; } = 7;
    public int MaxParallelDownloads { get; set; } = 15;
}

public class LockSettings
{
    public int MaxRetries { get; set; } = 30;
    public int RetryDelayMs { get; set; } = 1000;
}
