using System.Buffers;
using System.IO.Pipelines;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Altinn.Studio.EnvTopology;
using Altinn.Studio.HostBridge;
using LocalTest.HostBridge;
using LocalTest.Services.LocalApp.Implementation;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace LocalTest.Tests.LocalApp;

public sealed class LocalAppHttpTestDataTests
{
    private const string AppA = "ttd/app-a";
    private const string AppB = "ttd/app-b";

    [Fact]
    public async Task GetTestDataWithMetadata_AppLeavesTopologyBeforeItsTurn_TreatsItAsOffline()
    {
        var topology = new TopologyMonitor(AppA, AppB);
        await using var host = new FakeHost(_ =>
        {
            topology.Set(AppA);
            return (200, TestData(userId: 1337, lastName: "Nordmann"));
        });

        var result = await CreateLocalApp(topology, host).GetTestDataWithMetadata();

        Assert.Equal(new[] { "ttd/app-a/testData.json" }, host.RequestedPaths);
        Assert.Equal(new[] { 1337 }, result.Data!.Persons.Select(person => person.UserId));
        Assert.True(result.AllAppsHaveData);
    }

    [Fact]
    public async Task GetTestDataWithMetadata_AppStopsMidResponse_TreatsItAsOffline()
    {
        var topology = new TopologyMonitor(AppA, AppB);
        await using var host = new FakeHost(request =>
        {
            if (request.PathAndQuery.StartsWith(AppA))
            {
                return (200, TestData(userId: 1337, lastName: "Nordmann"));
            }

            topology.Set(AppA);
            return (200, """{"persons": [""");
        });

        var result = await CreateLocalApp(topology, host).GetTestDataWithMetadata();

        Assert.Equal(new[] { 1337 }, result.Data!.Persons.Select(person => person.UserId));
        Assert.True(result.AllAppsHaveData);
    }

    [Fact]
    public async Task GetTestDataWithMetadata_HostBridgeNotConnected_TreatsAppsAsOffline()
    {
        var topology = new TopologyMonitor(AppA, AppB);
        var hostBridge = new HostBridgeClient(
            NullLogger<HostBridgeClient>.Instance,
            Mock.Of<IHostApplicationLifetime>()
        );
        var localApp = new LocalAppHttp(
            new MemoryCache(new MemoryCacheOptions()),
            NullLogger<LocalAppHttp>.Instance,
            hostBridge,
            topology.Accessor
        );

        var result = await localApp.GetTestDataWithMetadata();

        Assert.Null(result.Data);
        Assert.False(result.AllAppsHaveData);
    }

    [Fact]
    public async Task GetTestDataWithMetadata_RunningAppSendsMalformedTestData_Throws()
    {
        var topology = new TopologyMonitor(AppA);
        await using var host = new FakeHost(_ => (200, """{"persons": ["""));

        await Assert.ThrowsAnyAsync<JsonException>(() => CreateLocalApp(topology, host).GetTestDataWithMetadata());
    }

    [Fact]
    public async Task GetTestDataWithMetadata_AppsConflict_Throws()
    {
        var topology = new TopologyMonitor(AppA, AppB);
        await using var host = new FakeHost(request =>
            (200, TestData(userId: 1337, lastName: request.PathAndQuery.StartsWith(AppA) ? "Nordmann" : "Salt"))
        );

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            CreateLocalApp(topology, host).GetTestDataWithMetadata()
        );

        Assert.Contains("Test data conflict detected in ttd/app-b", exception.Message);
    }

    [Fact]
    public async Task GetTestDataWithMetadata_CallerCancels_CachesNothing()
    {
        var topology = new TopologyMonitor(AppA, AppB);
        using var cancellation = new CancellationTokenSource();
        await using var host = new FakeHost(request =>
        {
            // The caller gives up while the first app answers, before the second app's turn
            cancellation.Cancel();
            return (200, TestData(userId: request.PathAndQuery.StartsWith(AppA) ? 1337 : 1338, lastName: "Nordmann"));
        });
        var localApp = CreateLocalApp(topology, host);

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            localApp.GetTestDataWithMetadata(cancellation.Token)
        );
        var result = await localApp.GetTestDataWithMetadata();

        Assert.Equal(new[] { 1337, 1338 }, result.Data!.Persons.Select(person => person.UserId).Order());
        Assert.True(result.AllAppsHaveData);
    }

    private static LocalAppHttp CreateLocalApp(TopologyMonitor topology, FakeHost host)
    {
        return new LocalAppHttp(
            new MemoryCache(new MemoryCacheOptions()),
            NullLogger<LocalAppHttp>.Instance,
            host.Client,
            topology.Accessor
        );
    }

    private static string TestData(int userId, string lastName)
    {
        return $$"""
            {
              "persons": [{ "partyId": {{500000 + userId}}, "ssn": "0101700{{userId:0000}}", "firstName": "Ola", "lastName": "{{lastName}}", "userId": {{userId}} }],
              "orgs": [],
              "systems": []
            }
            """;
    }

    private sealed class TopologyMonitor : IOptionsMonitor<BoundTopologyConfig>
    {
        private BoundTopologyConfig _config;
        private Action<BoundTopologyConfig, string?>? _listener;

        public TopologyMonitor(params string[] appIds)
        {
            _config = Config(appIds);
            Accessor = new BoundTopologyIndexAccessor(this, new BoundTopologyOptions());
        }

        public BoundTopologyIndexAccessor Accessor { get; }

        public BoundTopologyConfig CurrentValue => _config;

        public BoundTopologyConfig Get(string? name) => _config;

        public IDisposable? OnChange(Action<BoundTopologyConfig, string?> listener)
        {
            _listener = listener;
            return null;
        }

        public void Set(params string[] appIds)
        {
            _config = Config(appIds);
            _listener?.Invoke(_config, BoundTopologyOptions.BoundName);
        }

        private static BoundTopologyConfig Config(string[] appIds)
        {
            return new BoundTopologyConfig
            {
                Version = 1,
                Routes =
                [
                    .. appIds.Select(
                        (appId, index) =>
                            new BoundTopologyRoute
                            {
                                Component = "app",
                                Enabled = true,
                                Destination = new BoundTopologyDestination
                                {
                                    Kind = "http",
                                    Location = "host",
                                    Url = $"http://host.test:{5005 + index}",
                                },
                                Match = new BoundTopologyRouteMatch
                                {
                                    Host = "local.altinn.cloud",
                                    PathPrefix = $"/{appId}",
                                },
                                Metadata =
                                [
                                    new BoundTopologyMetadataEntry
                                    {
                                        Key = BoundTopologyMetadataKeys.AppId,
                                        Value = appId,
                                    },
                                ],
                            }
                    ),
                ],
            };
        }
    }

    /// <summary>
    /// Connects a host bridge over an in-memory websocket and answers its requests the way studioctl would.
    /// </summary>
    private sealed class FakeHost : IAsyncDisposable
    {
        private readonly CancellationTokenSource _cancellation = new();
        private readonly WebSocket _hostSocket;
        private readonly Task _bridgeLoop;
        private readonly Task _hostLoop;

        public FakeHost(Func<RequestStartFrame, (int StatusCode, string Body)> respond)
        {
            var toBridge = new Pipe();
            var toHost = new Pipe();
            var bridgeSocket = WebSocket.CreateFromStream(
                new DuplexStream(toBridge.Reader, toHost.Writer),
                isServer: true,
                subProtocol: null,
                keepAliveInterval: Timeout.InfiniteTimeSpan
            );
            _hostSocket = WebSocket.CreateFromStream(
                new DuplexStream(toHost.Reader, toBridge.Writer),
                isServer: false,
                subProtocol: null,
                keepAliveInterval: Timeout.InfiniteTimeSpan
            );

            Client = new HostBridgeClient(NullLogger<HostBridgeClient>.Instance, Mock.Of<IHostApplicationLifetime>());
            var context = new DefaultHttpContext();
            context.Features.Set<IHttpWebSocketFeature>(new WebSocketFeature(bridgeSocket));
            _bridgeLoop = Client.Accept(context, _cancellation.Token);
            Assert.True(Client.IsConnected);
            _hostLoop = Respond(respond);
        }

        public HostBridgeClient Client { get; }

        public List<string> RequestedPaths { get; } = [];

        public async ValueTask DisposeAsync()
        {
            _hostSocket.Abort();
            await _cancellation.CancelAsync();
            await Task.WhenAll(_bridgeLoop, _hostLoop).WaitAsync(TimeSpan.FromSeconds(10));
            _cancellation.Dispose();
        }

        private async Task Respond(Func<RequestStartFrame, (int StatusCode, string Body)> respond)
        {
            var receiveBuffer = new byte[8192];
            var message = new ArrayBufferWriter<byte>();
            try
            {
                while (await HostBridgeProtocol.ReadMessage(_hostSocket, receiveBuffer, message, _cancellation.Token))
                {
                    // GET requests carry no body, so only the start frame matters
                    if (HostBridgeProtocol.ReadKind(message.WrittenSpan) != HostBridgeFrameKind.RequestStart)
                    {
                        continue;
                    }

                    var request = HostBridgeProtocol.ReadJsonFrame<RequestStartFrame>(
                        HostBridgeFrameKind.RequestStart,
                        message.WrittenSpan
                    );
                    RequestedPaths.Add(request.PathAndQuery);
                    var (statusCode, body) = respond(request);
                    await Send(
                        HostBridgeProtocol.WriteJsonFrame(
                            HostBridgeFrameKind.ResponseStart,
                            new ResponseStartFrame(request.RequestId, statusCode, [])
                        )
                    );
                    await Send(
                        HostBridgeProtocol.WriteBodyFrame(
                            HostBridgeFrameKind.ResponseBody,
                            request.RequestId,
                            isFinal: true,
                            Encoding.UTF8.GetBytes(body)
                        )
                    );
                    await Send(
                        HostBridgeProtocol.WriteJsonFrame(
                            HostBridgeFrameKind.ResponseTrailers,
                            new HeadersFrame(request.RequestId, [])
                        )
                    );
                }
            }
            catch (Exception) when (_cancellation.IsCancellationRequested || _hostSocket.State == WebSocketState.Aborted)
            {
                // Torn down by DisposeAsync
            }
        }

        private Task Send(byte[] frame) => HostBridgeProtocol.SendFrame(_hostSocket, frame, _cancellation.Token);
    }

    private sealed class WebSocketFeature(WebSocket socket) : IHttpWebSocketFeature
    {
        public bool IsWebSocketRequest => true;

        public Task<WebSocket> AcceptAsync(WebSocketAcceptContext context) => Task.FromResult(socket);
    }

    private sealed class DuplexStream(PipeReader reader, PipeWriter writer) : Stream
    {
        private readonly Stream _reader = reader.AsStream();
        private readonly Stream _writer = writer.AsStream();

        public override bool CanRead => true;

        public override bool CanSeek => false;

        public override bool CanWrite => true;

        public override long Length => throw new NotSupportedException();

        public override long Position
        {
            get => throw new NotSupportedException();
            set => throw new NotSupportedException();
        }

        public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default) =>
            _reader.ReadAsync(buffer, cancellationToken);

        public override int Read(byte[] buffer, int offset, int count) => _reader.Read(buffer, offset, count);

        public override ValueTask WriteAsync(ReadOnlyMemory<byte> buffer, CancellationToken cancellationToken = default) =>
            _writer.WriteAsync(buffer, cancellationToken);

        public override void Write(byte[] buffer, int offset, int count) => _writer.Write(buffer, offset, count);

        public override Task FlushAsync(CancellationToken cancellationToken) => _writer.FlushAsync(cancellationToken);

        public override void Flush() => _writer.Flush();

        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();

        public override void SetLength(long value) => throw new NotSupportedException();

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                _reader.Dispose();
                _writer.Dispose();
            }

            base.Dispose(disposing);
        }
    }
}
