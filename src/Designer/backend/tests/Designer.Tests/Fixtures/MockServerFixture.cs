using System.Threading.Tasks;
using WireMock.Server;
using Xunit;

namespace Designer.Tests.Fixtures;

public class MockServerFixture : IAsyncLifetime
{
    public WireMockServer MockApi;

    public async Task InitializeAsync()
    {
        await Task.CompletedTask;
        int availablePort = TestUrlsProvider.GetRandomAvailablePort();
        MockApi = WireMockServer.Start(availablePort);
    }

    public async Task DisposeAsync()
    {
        await Task.CompletedTask;
        MockApi?.Stop();
    }
}
