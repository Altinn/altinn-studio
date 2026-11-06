using System.Net;
using System.Net.Sockets;
using Altinn.Studio.Gateway.Api.Clients.K8s;
using k8s;
using k8s.Models;

namespace Altinn.Studio.Gateway.Api.Tests;

public sealed class KubernetesClientFactoryTests
{
    private const string DeploymentsBody = """{"apiVersion":"apps/v1","kind":"DeploymentList","items":[]}""";

    // How the API server's connection breaks: closed, as in the gateway's traces, or reset.
    private const string Ended = "ended";
    private const string Reset = "reset";

    [Theory]
    [InlineData(Ended)]
    [InlineData(Reset)]
    public async Task Read_IsRetriedWhenTheConnectionBreaksBeforeTheResponse(string @break)
    {
        var apiServer = new FakeApiServer(BrokenConnection(@break), Ok(DeploymentsBody));
        using var kubernetes = KubernetesClientFactory.Create(Config(), apiServer);

        var deployments = await kubernetes.AppsV1.ListNamespacedDeploymentAsync(
            "default",
            cancellationToken: TestContext.Current.CancellationToken
        );

        Assert.Empty(deployments.Items);
        Assert.Equal(2, apiServer.Requests);
    }

    [Theory]
    [InlineData(Ended)]
    [InlineData(Reset)]
    public async Task Read_IsRetriedWhenTheConnectionBreaksWhileTheBodyArrives(string @break)
    {
        var apiServer = new FakeApiServer(BrokenBody(@break), Ok(DeploymentsBody));
        using var kubernetes = KubernetesClientFactory.Create(Config(), apiServer);

        var deployments = await kubernetes.AppsV1.ListNamespacedDeploymentAsync(
            "default",
            cancellationToken: TestContext.Current.CancellationToken
        );

        Assert.Empty(deployments.Items);
        Assert.Equal(2, apiServer.Requests);
    }

    [Fact]
    public async Task Read_FailsAfterTheLastRetry()
    {
        var apiServer = new FakeApiServer(BrokenConnection(Ended), BrokenConnection(Ended), BrokenConnection(Ended));
        using var kubernetes = KubernetesClientFactory.Create(Config(), apiServer);

        await Assert.ThrowsAsync<HttpRequestException>(() =>
            kubernetes.AppsV1.ListNamespacedDeploymentAsync(
                "default",
                cancellationToken: TestContext.Current.CancellationToken
            )
        );
        Assert.Equal(KubernetesClientFactory.MaxReadRetries + 1, apiServer.Requests);
    }

    [Fact]
    public async Task Watch_ReturnsBeforeItsBodyEnds()
    {
        using var events = new OpenWatchStream("""{"type":"ADDED","object":{}}""" + "\n");
        var apiServer = new FakeApiServer(() =>
            new HttpResponseMessage(HttpStatusCode.OK) { Content = new StreamContent(events) }
        );
        using var kubernetes = KubernetesClientFactory.Create(Config(), apiServer);

        using var response = await kubernetes
            .CoreV1.ListNamespacedPodWithHttpMessagesAsync(
                "default",
                watch: true,
                cancellationToken: TestContext.Current.CancellationToken
            )
            .WaitAsync(TimeSpan.FromSeconds(10), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.Response.StatusCode);
    }

    [Fact]
    public async Task Read_IsNotRetriedWhenTheApiServerAnswers()
    {
        var apiServer = new FakeApiServer(() => new HttpResponseMessage(HttpStatusCode.InternalServerError));
        using var kubernetes = KubernetesClientFactory.Create(Config(), apiServer);

        await Assert.ThrowsAsync<k8s.Autorest.HttpOperationException>(() =>
            kubernetes.AppsV1.ListNamespacedDeploymentAsync(
                "default",
                cancellationToken: TestContext.Current.CancellationToken
            )
        );
        Assert.Equal(1, apiServer.Requests);
    }

    [Fact]
    public async Task Write_IsNotRetried()
    {
        var apiServer = new FakeApiServer(BrokenConnection(Ended), Ok("{}"));
        using var kubernetes = KubernetesClientFactory.Create(Config(), apiServer);

        await Assert.ThrowsAsync<HttpRequestException>(() =>
            kubernetes.AppsV1.PatchNamespacedDeploymentAsync(
                new V1Patch("{}", V1Patch.PatchType.MergePatch),
                "my-app",
                "default",
                cancellationToken: TestContext.Current.CancellationToken
            )
        );
        Assert.Equal(1, apiServer.Requests);
    }

    [Fact]
    public void IsBrokenConnection_LooksThroughWrappingExceptions()
    {
        var wrapped = new HttpRequestException(
            "Error while copying content to a stream.",
            new HttpIOException(HttpRequestError.ResponseEnded)
        );

        Assert.True(KubernetesClientFactory.IsBrokenConnection(wrapped));
        Assert.False(KubernetesClientFactory.IsBrokenConnection(new InvalidOperationException()));
        Assert.False(
            KubernetesClientFactory.IsBrokenConnection(
                new HttpRequestException(HttpRequestError.NameResolutionError, "No such host.")
            )
        );
    }

    private static KubernetesClientConfiguration Config() => new() { Host = "http://kubernetes.test" };

    // What SocketsHttpHandler throws when the connection breaks before the response headers.
    private static Func<HttpResponseMessage> BrokenConnection(string @break) =>
        () =>
            throw @break switch
            {
                Ended => new HttpRequestException(
                    HttpRequestError.ResponseEnded,
                    "The response ended prematurely while waiting for the next frame from the server.",
                    new HttpIOException(HttpRequestError.ResponseEnded)
                ),
                _ => new HttpRequestException(
                    "An error occurred while sending the request.",
                    new IOException(
                        "Unable to read data from the transport connection.",
                        new IOException(
                            "Unable to read data from the transport connection.",
                            new SocketException((int)SocketError.ConnectionReset)
                        )
                    )
                ),
            };

    // What the response stream throws when the connection breaks while the body arrives.
    private static Exception BrokenBodyRead(string @break) =>
        @break switch
        {
            Ended => new HttpIOException(HttpRequestError.ResponseEnded),
            _ => new IOException(
                "Unable to read data from the transport connection.",
                new SocketException((int)SocketError.ConnectionReset)
            ),
        };

    private static Func<HttpResponseMessage> Ok(string body) =>
        () =>
            new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json"),
            };

    private static Func<HttpResponseMessage> BrokenBody(string @break) =>
        () =>
            new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StreamContent(new BrokenStream(BrokenBodyRead(@break))),
            };

    /// <summary>
    /// Answers each request with the next of its responses.
    /// </summary>
    private sealed class FakeApiServer(params Func<HttpResponseMessage>[] responses) : DelegatingHandler
    {
        private int _requests;

        public int Requests => _requests;

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            var response = responses[Interlocked.Increment(ref _requests) - 1]();
            response.RequestMessage = request;
            return Task.FromResult(response);
        }
    }

    /// <summary>
    /// A watch's body: its first event, and then nothing until the watch is disposed.
    /// </summary>
    private sealed class OpenWatchStream(string firstEvent)
        : MemoryStream(System.Text.Encoding.UTF8.GetBytes(firstEvent))
    {
        private readonly TaskCompletionSource<int> _closed = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public override async ValueTask<int> ReadAsync(
            Memory<byte> buffer,
            CancellationToken cancellationToken = default
        )
        {
            var read = await base.ReadAsync(buffer, cancellationToken);
            return read > 0 ? read : await _closed.Task.WaitAsync(cancellationToken);
        }

        public override Task<int> ReadAsync(
            byte[] buffer,
            int offset,
            int count,
            CancellationToken cancellationToken
        ) => ReadAsync(buffer.AsMemory(offset, count), cancellationToken).AsTask();

        protected override void Dispose(bool disposing)
        {
            _closed.TrySetResult(0);
            base.Dispose(disposing);
        }
    }

    /// <summary>
    /// A response body whose connection breaks before it ends.
    /// </summary>
    private sealed class BrokenStream(Exception failure) : MemoryStream
    {
        public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default) =>
            ValueTask.FromException<int>(failure);

        public override Task<int> ReadAsync(
            byte[] buffer,
            int offset,
            int count,
            CancellationToken cancellationToken
        ) => Task.FromException<int>(failure);
    }
}
