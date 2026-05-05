#nullable enable

namespace Altinn.Studio.EnvTopology;

public sealed class BoundTopologyOptions
{
    public const string SectionName = "BoundTopologyOptions";

    public const string BaseName = "base";

    public const string BoundName = "bound";

    public const string BaseConfigPathConfigurationKey = SectionName + ":BaseConfigPath";

    public const string ConfigPathConfigurationKey = SectionName + ":ConfigPath";

    public const string BaseConfigPathEnvironmentVariable = SectionName + "__BaseConfigPath";

    public const string ConfigPathEnvironmentVariable = SectionName + "__ConfigPath";

    public string? BaseConfigPath { get; set; }

    public string? ConfigPath { get; set; }

    public TimeSpan PollInterval { get; set; } = TimeSpan.FromSeconds(10);
}
