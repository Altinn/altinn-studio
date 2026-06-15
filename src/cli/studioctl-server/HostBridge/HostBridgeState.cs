namespace Altinn.Studio.StudioctlServer.HostBridge;

internal sealed class HostBridgeState
{
    private readonly object _lock = new();
    private bool _connected;

    public HostBridgeState(HostBridgeOptions options)
    {
        Url = options.Url;
    }

    public string? Url { get; }

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
