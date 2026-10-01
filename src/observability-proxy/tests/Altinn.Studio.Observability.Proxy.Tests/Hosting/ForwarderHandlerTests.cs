using Altinn.Studio.Observability.Proxy.Hosting;

namespace Altinn.Studio.Observability.Proxy.Tests.Hosting;

public sealed class ForwarderHandlerTests
{
    [Fact]
    public void Connections_AreReplacedAfterFiveMinutes()
    {
        using var handler = new SocketsHttpHandler();

        ObservabilityProxyExtensions.ConfigureForwarderHandler(handler);

        Assert.Equal(TimeSpan.FromMinutes(5), handler.PooledConnectionLifetime);
    }

    [Fact]
    public void Requests_CarryNoTraceContext()
    {
        using var handler = new SocketsHttpHandler();

        ObservabilityProxyExtensions.ConfigureForwarderHandler(handler);

        Assert.Null(handler.ActivityHeadersPropagator);
    }
}
