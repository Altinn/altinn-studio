namespace Altinn.App.Core.Configuration;

/// <summary>
/// Metric settings for Altinn Apps
/// </summary>
[Obsolete("MetricSettings will no longer be supported in version 9.")]
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
