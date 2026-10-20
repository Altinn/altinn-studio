namespace Altinn.Studio.StudioctlServer.HostBridge;

internal sealed class HostBridgeOptions
{
    public string? Url { get; set; }

    public TimeSpan ConnectTimeout { get; set; } = TimeSpan.FromSeconds(5);

    /// <summary>
    /// How long a request forwarded to a host target may take before its response headers arrive.
    /// The default matches the workflow engine's longest step command timeout, so a long-running
    /// service task called through localtest is not cut off before the engine gives up on it.
    /// </summary>
    public TimeSpan RequestTimeout { get; set; } = TimeSpan.FromHours(2);
}
