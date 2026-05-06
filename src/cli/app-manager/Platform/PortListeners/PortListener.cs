using System.Net;

namespace Altinn.Studio.AppManager.Platform.PortListeners;

internal sealed record PortListener(
    int ProcessId,
    int Port,
    ListenerBindScope BindScope,
    string? ProcessName = null,
    string? CommandLine = null
)
{
    public static PortListener FromAddress(int processId, int port, IPAddress address, string? processName = null) =>
        new(processId, port, ClassifyAddress(address), processName);

    private static ListenerBindScope ClassifyAddress(IPAddress address)
    {
        if (IPAddress.IsLoopback(address))
            return ListenerBindScope.Loopback;

        if (address.Equals(IPAddress.Any) || address.Equals(IPAddress.IPv6Any))
            return ListenerBindScope.Any;

        return ListenerBindScope.Specific;
    }
}

internal enum ListenerBindScope
{
    Loopback,
    Any,
    Specific,
}
