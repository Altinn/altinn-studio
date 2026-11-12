using Altinn.Studio.StudioctlServer.Platform.PortListeners;

namespace Studioctl.Tests.Platform.PortListeners;

public sealed class WindowsPortListenersTests
{
    private const uint Listen = 2;
    private const uint Established = 5;
    private const uint UnknownState = 0x4000_0000;

    [Theory]
    [InlineData(Listen, 1234u, true, true)]
    [InlineData(UnknownState, 1234u, true, true)]
    [InlineData(Established, 1234u, true, true)]
    [InlineData(Listen, 0u, true, true)]
    [InlineData(UnknownState, 0u, true, false)]
    [InlineData(UnknownState, 1234u, false, false)]
    [InlineData(Established, 1234u, false, false)]
    public void IsListenerRow_AcceptsListenStateOrOwnedRowWithoutRemoteEndpoint(
        uint state,
        uint owningPid,
        bool remoteIsUnspecified,
        bool expected
    )
    {
        Assert.Equal(expected, WindowsPortListeners.IsListenerRow(state, owningPid, remoteIsUnspecified));
    }
}
