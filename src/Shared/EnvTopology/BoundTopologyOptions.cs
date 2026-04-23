#nullable enable

namespace Altinn.Studio.EnvTopology;

public sealed class BoundTopologyOptions
{
    public const string SectionName = "BoundTopologyOptions";

    public const string BaseName = "base";

    public const string MergedName = "merged";

    public const string BasePathConfigurationKey = SectionName + ":BasePath";

    public const string MergedPathConfigurationKey = SectionName + ":MergedPath";

    public const string BasePathEnvironmentVariable = SectionName + "__BasePath";

    public const string MergedPathEnvironmentVariable = SectionName + "__MergedPath";

    public string? BasePath { get; set; }

    public string? MergedPath { get; set; }

    public TimeSpan PollInterval { get; set; } = TimeSpan.FromSeconds(10);
}
