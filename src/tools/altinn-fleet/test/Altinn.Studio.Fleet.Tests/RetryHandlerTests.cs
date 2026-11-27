using System.Net;
using Altinn.Studio.Fleet.Http;

namespace Altinn.Studio.Fleet.Tests;

public sealed class RetryHandlerTests
{
    [Theory]
    [InlineData(HttpStatusCode.ServiceUnavailable)]
    [InlineData(HttpStatusCode.TooManyRequests)]
    [InlineData((HttpStatusCode)0)]
    public async Task TransientFailures_AreRetried(HttpStatusCode first)
    {
        var handler = new Sequence(first, HttpStatusCode.OK);
        using HttpClient client = FleetHttp.CreateClient("test", FleetTestContext.NoDelay, handler);

        using HttpResponseMessage response = await client.GetAsync(
            new Uri("https://example.com/"),
            TestContext.Current.CancellationToken
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2, handler.Calls);
    }

    [Fact]
    public async Task NameResolutionFailure_IsNotRetried()
    {
        var handler = new Sequence((HttpStatusCode)1, HttpStatusCode.OK);
        using HttpClient client = FleetHttp.CreateClient("test", FleetTestContext.NoDelay, handler);

        await Assert.ThrowsAsync<HttpRequestException>(() =>
            client.GetAsync(new Uri("https://example.com/"), TestContext.Current.CancellationToken)
        );
        Assert.Equal(1, handler.Calls);
    }

    [Fact]
    public async Task Retries_StopAfterTheLastAttempt()
    {
        var handler = new Sequence(
            HttpStatusCode.BadGateway,
            HttpStatusCode.BadGateway,
            HttpStatusCode.BadGateway,
            HttpStatusCode.OK
        );
        using HttpClient client = FleetHttp.CreateClient("test", FleetTestContext.NoDelay, handler);

        using HttpResponseMessage response = await client.GetAsync(
            new Uri("https://example.com/"),
            TestContext.Current.CancellationToken
        );

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        Assert.Equal(3, handler.Calls);
    }

    [Fact]
    public async Task ClientErrors_AreNotRetried()
    {
        var handler = new Sequence(HttpStatusCode.NotFound, HttpStatusCode.OK);
        using HttpClient client = FleetHttp.CreateClient("test", FleetTestContext.NoDelay, handler);

        using HttpResponseMessage response = await client.PostAsync(
            new Uri("https://example.com/"),
            new StringContent("[]"),
            TestContext.Current.CancellationToken
        );

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(1, handler.Calls);
    }

    [Fact]
    public async Task RetriedPost_SendsItsContentAgain()
    {
        var handler = new Sequence(HttpStatusCode.ServiceUnavailable, HttpStatusCode.OK);
        using HttpClient client = FleetHttp.CreateClient("test", FleetTestContext.NoDelay, handler);

        using HttpResponseMessage response = await client.PostAsync(
            new Uri("https://example.com/"),
            new StringContent("[1]"),
            TestContext.Current.CancellationToken
        );

        Assert.Equal(["[1]", "[1]"], handler.Bodies);
    }

    private sealed class Sequence(params HttpStatusCode[] statuses) : HttpMessageHandler
    {
        public int Calls { get; private set; }

        public List<string> Bodies { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            HttpStatusCode status = statuses[Calls++];
            if (request.Content is not null)
            {
                Bodies.Add(await request.Content.ReadAsStringAsync(cancellationToken));
            }

            return status switch
            {
                0 => throw new HttpRequestException("connection reset"),
                (HttpStatusCode)1 => throw new HttpRequestException(
                    HttpRequestError.NameResolutionError,
                    "no such host"
                ),
                _ => new HttpResponseMessage(status),
            };
        }
    }
}
