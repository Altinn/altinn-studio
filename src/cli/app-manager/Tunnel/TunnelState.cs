namespace Altinn.Studio.AppManager.Tunnel;

internal sealed class TunnelState
{
    private readonly object _lock = new();
    private bool _connected;

    public TunnelState(TunnelOptions options)
    {
        Url = options.Url;
        UpstreamUrl = options.UpstreamUrl;
    }

    public string? Url { get; }

    public string UpstreamUrl { get; }

    public bool Enabled => !string.IsNullOrWhiteSpace(Url);

    public bool IsConnected
    {
        get
        {
            lock (_lock)
                return _connected;
        }
    }

    public void SetConnected(bool connected)
    {
        lock (_lock)
            _connected = connected;
    }
}
