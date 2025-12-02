namespace StudioGateway.Api.Designer;

internal sealed class StudioEnvironments : Dictionary<string, StudioEnvironmentConfig>;

internal sealed class StudioEnvironmentConfig
{
    public string Url { get; set; } = string.Empty;
}
