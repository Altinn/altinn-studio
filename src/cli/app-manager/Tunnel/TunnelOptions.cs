namespace Altinn.Studio.AppManager.Tunnel;

internal sealed class TunnelOptions
{
    public string? Url { get; set; }

    public string UpstreamUrl { get; set; } = "http://127.0.0.1:5005";

    public TimeSpan ConnectTimeout { get; set; } = TimeSpan.FromSeconds(5);
}
