namespace Altinn.App.Api.Configuration;

/// <summary>
/// Metric settings for Altinn Apps
/// </summary>
public class MetricsSettings
{
    /// <summary>
    /// Gets or sets a value indicating whether metrics is enabled or not
    /// </summary>
    public bool Enabled { get; set; } = true;
    /// <summary>
    /// Gets or sets the port for the metrics server is exposed
    /// </summary>
    public ushort Port { get; set; } = 5006;
}
