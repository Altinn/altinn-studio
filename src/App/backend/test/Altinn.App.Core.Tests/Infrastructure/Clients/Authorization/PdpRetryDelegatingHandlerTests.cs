using System.Net;
using Altinn.App.Core.Infrastructure.Clients.Authorization;
using Altinn.App.PlatformServices.Tests.Mocks;
using Microsoft.Extensions.Logging.Abstractions;

namespace Altinn.App.Core.Tests.Infrastructure.Clients.Authorization;

public class PdpRetryDelegatingHandlerTests
{
    private const string RequestBody = """{"Request":{}}""";
    private const string ResponseBody = """{"Response":[]}""";

    [Theory]
    [InlineData(HttpStatusCode.BadGateway)]
    [InlineData(HttpStatusCode.ServiceUnavailable)]
    [InlineData(HttpStatusCode.GatewayTimeout)]
    public async Task SendAsync_RetriesOnce_WhenFirstResponseIsTransient(HttpStatusCode statusCode)
    {
        List<string> receivedBodies = [];
        using HttpClient client = CreateClient(
            receivedBodies,
            () => new HttpResponseMessage(statusCode),
            () => new HttpResponseMessage(HttpStatusCode.OK)
        );

        using HttpResponseMessage response = await client.PostAsync("decision", new StringContent(RequestBody));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal([RequestBody, RequestBody], receivedBodies);
    }

    [Fact]
    public async Task SendAsync_DisposesFirstResponse_WhenRetrying()
    {
        var firstResponse = new DisposeTrackingResponse(HttpStatusCode.ServiceUnavailable);
        using HttpClient client = CreateClient(
            [],
            () => firstResponse,
            () => new HttpResponseMessage(HttpStatusCode.OK)
        );

        using HttpResponseMessage response = await client.PostAsync("decision", new StringContent(RequestBody));

        Assert.True(firstResponse.IsDisposed);
    }

    [Fact]
    public async Task SendAsync_RetriesOnce_WhenFirstAttemptThrowsHttpRequestException()
    {
        List<string> receivedBodies = [];
        using HttpClient client = CreateClient(
            receivedBodies,
            () => throw new HttpRequestException("An error occurred while sending the request."),
            () => new HttpResponseMessage(HttpStatusCode.OK)
        );

        using HttpResponseMessage response = await client.PostAsync("decision", new StringContent(RequestBody));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal([RequestBody, RequestBody], receivedBodies);
    }

    [Fact]
    public async Task SendAsync_RetriesOnce_WhenReadingFirstResponseBodyFails()
    {
        List<string> receivedBodies = [];
        using HttpClient client = CreateClient(
            receivedBodies,
            () => new HttpResponseMessage(HttpStatusCode.OK) { Content = new BodyReadFailingContent() },
            () => new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(ResponseBody) }
        );

        using HttpResponseMessage response = await client.PostAsync("decision", new StringContent(RequestBody));

        Assert.Equal(ResponseBody, await response.Content.ReadAsStringAsync());
        Assert.Equal([RequestBody, RequestBody], receivedBodies);
    }

    [Fact]
    public async Task SendAsync_DisposesFirstResponse_WhenReadingItsBodyFails()
    {
        var firstResponse = new DisposeTrackingResponse(HttpStatusCode.OK) { Content = new BodyReadFailingContent() };
        using HttpClient client = CreateClient(
            [],
            () => firstResponse,
            () => new HttpResponseMessage(HttpStatusCode.OK)
        );

        using HttpResponseMessage response = await client.PostAsync("decision", new StringContent(RequestBody));

        Assert.True(firstResponse.IsDisposed);
    }

    [Fact]
    public async Task SendAsync_DisposesResponse_WhenRequestIsCanceledWhileBodyIsRead()
    {
        List<string> receivedBodies = [];
        using var cancellation = new CancellationTokenSource();
        var firstResponse = new DisposeTrackingResponse(HttpStatusCode.OK)
        {
            Content = new BodyReadCanceledContent(cancellation),
        };
        using HttpClient client = CreateClient(
            receivedBodies,
            () => firstResponse,
            () => new HttpResponseMessage(HttpStatusCode.OK)
        );

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            client.PostAsync("decision", new StringContent(RequestBody), cancellation.Token)
        );

        Assert.True(firstResponse.IsDisposed);
        Assert.Single(receivedBodies);
    }

    [Fact]
    public async Task SendAsync_ReturnsSecondResponse_WhenBothResponsesAreTransient()
    {
        List<string> receivedBodies = [];
        using HttpClient client = CreateClient(
            receivedBodies,
            () => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable),
            () => new HttpResponseMessage(HttpStatusCode.GatewayTimeout)
        );

        using HttpResponseMessage response = await client.PostAsync("decision", new StringContent(RequestBody));

        Assert.Equal(HttpStatusCode.GatewayTimeout, response.StatusCode);
        Assert.Equal(2, receivedBodies.Count);
    }

    [Fact]
    public async Task SendAsync_ThrowsHttpRequestException_WhenBothAttemptsThrow()
    {
        List<string> receivedBodies = [];
        using HttpClient client = CreateClient(
            receivedBodies,
            () => throw new HttpRequestException("first"),
            () => throw new HttpRequestException("second")
        );

        var exception = await Assert.ThrowsAsync<HttpRequestException>(() =>
            client.PostAsync("decision", new StringContent(RequestBody))
        );

        Assert.Equal("second", exception.Message);
        Assert.Equal(2, receivedBodies.Count);
    }

    [Theory]
    [InlineData(HttpStatusCode.OK)]
    [InlineData(HttpStatusCode.BadRequest)]
    [InlineData(HttpStatusCode.Unauthorized)]
    [InlineData(HttpStatusCode.Forbidden)]
    [InlineData(HttpStatusCode.NotFound)]
    [InlineData(HttpStatusCode.TooManyRequests)]
    [InlineData(HttpStatusCode.InternalServerError)]
    public async Task SendAsync_DoesNotRetry_WhenResponseIsNotTransient(HttpStatusCode statusCode)
    {
        List<string> receivedBodies = [];
        using HttpClient client = CreateClient(receivedBodies, () => new HttpResponseMessage(statusCode));

        using HttpResponseMessage response = await client.PostAsync("decision", new StringContent(RequestBody));

        Assert.Equal(statusCode, response.StatusCode);
        Assert.Single(receivedBodies);
    }

    [Fact]
    public async Task SendAsync_DoesNotRetry_WhenFirstAttemptThrowsTaskCanceledException()
    {
        List<string> receivedBodies = [];
        using HttpClient client = CreateClient(receivedBodies, () => throw new TaskCanceledException());

        await Assert.ThrowsAsync<TaskCanceledException>(() =>
            client.PostAsync("decision", new StringContent(RequestBody))
        );

        Assert.Single(receivedBodies);
    }

    [Fact]
    public async Task SendAsync_DoesNotRetry_WhenRequestIsCanceledAfterFirstAttemptFails()
    {
        List<string> receivedBodies = [];
        using var cancellation = new CancellationTokenSource();
        using HttpClient client = CreateClient(
            receivedBodies,
            () =>
            {
                cancellation.Cancel();
                throw new HttpRequestException("An error occurred while sending the request.");
            },
            () => new HttpResponseMessage(HttpStatusCode.OK)
        );

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            client.PostAsync("decision", new StringContent(RequestBody), cancellation.Token)
        );

        Assert.Single(receivedBodies);
    }

    [Fact]
    public async Task SendAsync_DoesNotRetry_WhenRequestIsCanceledAfterFirstResponseIsTransient()
    {
        List<string> receivedBodies = [];
        using var cancellation = new CancellationTokenSource();
        var firstResponse = new DisposeTrackingResponse(HttpStatusCode.ServiceUnavailable);
        using HttpClient client = CreateClient(
            receivedBodies,
            () =>
            {
                cancellation.Cancel();
                return firstResponse;
            },
            () => new HttpResponseMessage(HttpStatusCode.OK)
        );

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            client.PostAsync("decision", new StringContent(RequestBody), cancellation.Token)
        );

        Assert.True(firstResponse.IsDisposed);
        Assert.Single(receivedBodies);
    }

    [Theory]
    [InlineData(HttpStatusCode.OK)]
    [InlineData(HttpStatusCode.ServiceUnavailable)]
    public async Task SendAsync_HasNoAttemptInFlight_WhenItReturns(HttpStatusCode secondStatusCode)
    {
        int started = 0;
        int finished = 0;
        var pdp = new DelegatingHandlerStub(
            async (_, _) =>
            {
                started++;
                await Task.Yield();
                finished++;
                return new HttpResponseMessage(started == 1 ? HttpStatusCode.ServiceUnavailable : secondStatusCode);
            }
        );
        using var client = new HttpClient(
            new PdpRetryDelegatingHandler(NullLogger<PdpRetryDelegatingHandler>.Instance) { InnerHandler = pdp }
        )
        {
            BaseAddress = new Uri("http://localhost/authorization/api/v1/"),
        };

        using HttpResponseMessage response = await client.PostAsync("decision", new StringContent(RequestBody));
        int startedWhenReturned = started;
        await Task.Delay(100);

        Assert.Equal(secondStatusCode, response.StatusCode);
        Assert.Equal(2, startedWhenReturned);
        Assert.Equal(startedWhenReturned, finished);
        Assert.Equal(startedWhenReturned, started);
    }

    private static HttpClient CreateClient(List<string> receivedBodies, params Func<HttpResponseMessage>[] attempts)
    {
        var pdp = new DelegatingHandlerStub(
            async (request, cancellationToken) =>
            {
                Assert.NotNull(request.Content);
                receivedBodies.Add(await request.Content.ReadAsStringAsync(cancellationToken));
                return attempts[receivedBodies.Count - 1]();
            }
        );
        var handler = new PdpRetryDelegatingHandler(NullLogger<PdpRetryDelegatingHandler>.Instance)
        {
            InnerHandler = pdp,
        };
        return new HttpClient(handler) { BaseAddress = new Uri("http://localhost/authorization/api/v1/") };
    }

    private sealed class DisposeTrackingResponse(HttpStatusCode statusCode) : HttpResponseMessage(statusCode)
    {
        public bool IsDisposed { get; private set; }

        protected override void Dispose(bool disposing)
        {
            IsDisposed = true;
            base.Dispose(disposing);
        }
    }

    // A body whose connection drops while it is read, as SocketsHttpHandler reports it
    private sealed class BodyReadFailingContent : HttpContent
    {
        protected override Task SerializeToStreamAsync(Stream stream, TransportContext? context) =>
            Task.FromException(new HttpIOException(HttpRequestError.ResponseEnded, "The response ended prematurely."));

        protected override bool TryComputeLength(out long length)
        {
            length = 0;
            return false;
        }
    }

    // A body whose read is canceled with the request, through the token the read was given
    private sealed class BodyReadCanceledContent(CancellationTokenSource cancellation) : HttpContent
    {
        protected override async Task SerializeToStreamAsync(
            Stream stream,
            TransportContext? context,
            CancellationToken cancellationToken
        )
        {
            await cancellation.CancelAsync();
            cancellationToken.ThrowIfCancellationRequested();
        }

        protected override Task SerializeToStreamAsync(Stream stream, TransportContext? context) =>
            SerializeToStreamAsync(stream, context, CancellationToken.None);

        protected override bool TryComputeLength(out long length)
        {
            length = 0;
            return false;
        }
    }
}
