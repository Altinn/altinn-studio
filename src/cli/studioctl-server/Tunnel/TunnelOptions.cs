namespace Altinn.Studio.StudioctlServer.Tunnel;

internal sealed class TunnelOptions
{
    public string? Url { get; set; }

    public TimeSpan ConnectTimeout { get; set; } = TimeSpan.FromSeconds(5);
}
