namespace Altinn.Studio.StudioctlServer.HostBridge;

internal sealed class HostBridgeOptions
{
    public string? Url { get; set; }

    public TimeSpan ConnectTimeout { get; set; } = TimeSpan.FromSeconds(5);
}
