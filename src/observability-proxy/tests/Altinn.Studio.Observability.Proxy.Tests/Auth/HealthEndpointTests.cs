using System.Net;

namespace Altinn.Studio.Observability.Proxy.Tests.Auth;

public sealed class HealthEndpointTests
{
    [Fact]
    public async Task LivenessEndpoint_AnswersWithoutSerializingAnObject()
    {
        await using var proxy = await TestWebApplication.StartProxyAsync(new Dictionary<string, string?>());

        using var response = await proxy.Client.GetAsync(
            new Uri("/health/live", UriKind.Relative),
            TestContext.Current.CancellationToken
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
        // The published image is ahead-of-time compiled, where returning an anonymous object here
        // throws at runtime. Keeping the response plain text is what makes it safe.
        Assert.Equal("text/plain", response.Content.Headers.ContentType?.MediaType);
    }
}
