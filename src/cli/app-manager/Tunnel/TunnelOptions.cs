namespace Altinn.Studio.AppManager.Tunnel;

internal sealed class TunnelOptions
{
    public string? Url { get; set; }

    public TimeSpan ConnectTimeout { get; set; } = TimeSpan.FromSeconds(5);
}
