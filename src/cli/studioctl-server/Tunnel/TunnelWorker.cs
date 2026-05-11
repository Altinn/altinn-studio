using System.Buffers;
using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Headers;
using System.Net.WebSockets;
using System.Threading.Channels;
using Altinn.Studio.AppTunnel;
using Altinn.Studio.EnvTopology;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;

namespace Altinn.Studio.StudioctlServer.Tunnel;

internal sealed class TunnelWorker : BackgroundService
{
    private static readonly HttpClient HttpClient = new(
        new SocketsHttpHandler
        {
            UseProxy = false,
            AllowAutoRedirect = false,
            AutomaticDecompression = DecompressionMethods.None,
            UseCookies = false,
            EnableMultipleHttp2Connections = true,
            PooledConnectionLifetime = TimeSpan.FromMinutes(2),
            ConnectTimeout = TimeSpan.FromSeconds(5),
        }
    );

    private readonly TunnelOptions _options;
    private readonly TunnelState _state;
    private readonly ILogger<TunnelWorker> _logger;
    private readonly BoundTopologyIndexAccessor _boundTopologyIndex;

    public TunnelWorker(
        IOptions<TunnelOptions> options,
        TunnelState state,
        ILogger<TunnelWorker> logger,
        BoundTopologyIndexAccessor boundTopologyIndex
    )
    {
        _options = options.Value;
        _state = state;
        _logger = logger;
        _boundTopologyIndex = boundTopologyIndex;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (string.IsNullOrWhiteSpace(_options.Url))
        {
            _logger.LogInformation("App tunnel disabled");
            return;
        }

        var delay = TimeSpan.FromSeconds(1);
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunConnection(stoppingToken);
                delay = TimeSpan.FromSeconds(1);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "App tunnel connection failed");
            }

            await Task.Delay(delay, stoppingToken);
            delay = delay < TimeSpan.FromSeconds(10) ? delay + delay : delay;
        }
    }

    private async Task RunConnection(CancellationToken cancellationToken)
    {
        var tunnelUrl = _options.Url;
        if (string.IsNullOrWhiteSpace(tunnelUrl))
            return;

        using var socket = new ClientWebSocket();
        if (_logger.IsEnabled(LogLevel.Information))
            _logger.LogInformation("Connecting app tunnel to {Url}", tunnelUrl);
        await ConnectTunnelSocket(socket, tunnelUrl, cancellationToken);
        _state.SetConnected(true);
        _logger.LogInformation("App tunnel connected");

        var sendLock = new SemaphoreSlim(1, 1);
        var pending = new ConcurrentDictionary<long, PendingRequest>();
        var receiveBuffer = new byte[8192];
        var messageBuffer = new ArrayBufferWriter<byte>(8192);

        try
        {
            while (socket.State == WebSocketState.Open && !cancellationToken.IsCancellationRequested)
            {
                if (!await TunnelProtocol.ReadMessage(socket, receiveBuffer, messageBuffer, cancellationToken))
                    break;

                await HandleMessage(socket, sendLock, pending, messageBuffer.WrittenMemory, cancellationToken);
            }
        }
        finally
        {
            foreach (var entry in pending)
                if (pending.TryRemove(entry.Key, out var request))
                    request.Cancel();

            _state.SetConnected(false);
            sendLock.Dispose();
            _logger.LogInformation("App tunnel disconnected");
        }
    }

    private async Task ConnectTunnelSocket(
        ClientWebSocket socket,
        string tunnelUrl,
        CancellationToken cancellationToken
    )
    {
        using var connectTimeout = new CancellationTokenSource(_options.ConnectTimeout);
        using var linkedCancellation = CancellationTokenSource.CreateLinkedTokenSource(
            cancellationToken,
            connectTimeout.Token
        );

        try
        {
            await socket.ConnectAsync(new Uri(tunnelUrl, UriKind.Absolute), linkedCancellation.Token);
        }
        catch (OperationCanceledException)
            when (!cancellationToken.IsCancellationRequested && connectTimeout.IsCancellationRequested)
        {
            throw new TimeoutException(
                $"timed out connecting app tunnel to {tunnelUrl} after {_options.ConnectTimeout}"
            );
        }
    }

    private async Task HandleMessage(
        ClientWebSocket socket,
        SemaphoreSlim sendLock,
        ConcurrentDictionary<long, PendingRequest> pending,
        ReadOnlyMemory<byte> message,
        CancellationToken cancellationToken
    )
    {
        switch (TunnelProtocol.ReadKind(message.Span))
        {
            case TunnelFrameKind.RequestStart:
            {
                var frame = TunnelProtocol.ReadJsonFrame<RequestStartFrame>(TunnelFrameKind.RequestStart, message.Span);
                var request = new PendingRequest(frame);
                if (!pending.TryAdd(frame.RequestId, request))
                {
                    request.Cancel();
                    throw new InvalidDataException($"duplicate app tunnel request id {frame.RequestId}");
                }

                if (_logger.IsEnabled(LogLevel.Debug))
                {
                    _logger.LogDebug(
                        "Accepted tunnel request {RequestId} for target {Target}:{TargetPort} path {Path}",
                        frame.RequestId,
                        frame.Target,
                        frame.TargetPort,
                        frame.PathAndQuery
                    );
                }
                break;
            }
            case TunnelFrameKind.RequestBody:
            {
                var frame = TunnelProtocol.ReadBodyFrame(TunnelFrameKind.RequestBody, message.Span);
                if (pending.TryGetValue(frame.RequestId, out var request))
                {
                    if (!request.IsStarted)
                        request.StartProcessing(() =>
                            ProcessRequest(socket, sendLock, request, pending, cancellationToken)
                        );

                    await request.AppendBody(frame.Payload, frame.IsFinal, cancellationToken);
                }
                break;
            }
            case TunnelFrameKind.Cancel:
            {
                var frame = TunnelProtocol.ReadJsonFrame<ErrorFrame>(TunnelFrameKind.Cancel, message.Span);
                if (pending.TryRemove(frame.RequestId, out var request))
                    request.Cancel();
                break;
            }
            default:
                throw new InvalidDataException("unexpected app tunnel request frame");
        }
    }

    private async Task ProcessRequest(
        ClientWebSocket socket,
        SemaphoreSlim sendLock,
        PendingRequest pendingRequest,
        ConcurrentDictionary<long, PendingRequest> pending,
        CancellationToken cancellationToken
    )
    {
        using var requestCancellation = CancellationTokenSource.CreateLinkedTokenSource(
            cancellationToken,
            pendingRequest.CancellationTokenSource.Token
        );
        var requestCancellationToken = requestCancellation.Token;

        try
        {
            using var response = await SendUpstreamRequest(pendingRequest);

            var responseStart = new ResponseStartFrame(
                pendingRequest.RequestId,
                (int)response.StatusCode,
                CollectResponseHeaders(response)
            );

            await SendFrame(
                socket,
                sendLock,
                TunnelProtocol.WriteJsonFrame(TunnelFrameKind.ResponseStart, responseStart),
                cancellationToken
            );
            await SendBodyFrames(
                socket,
                sendLock,
                response.Content,
                TunnelFrameKind.ResponseBody,
                pendingRequest.RequestId,
                requestCancellationToken
            );
            await SendFrame(
                socket,
                sendLock,
                TunnelProtocol.WriteJsonFrame(
                    TunnelFrameKind.ResponseTrailers,
                    new HeadersFrame(pendingRequest.RequestId, CollectResponseTrailers(response))
                ),
                requestCancellationToken
            );
            if (_logger.IsEnabled(LogLevel.Debug))
            {
                _logger.LogDebug(
                    "Completed tunnel request {RequestId} for target {Target}:{TargetPort} with status {StatusCode}",
                    pendingRequest.RequestId,
                    pendingRequest.Target,
                    pendingRequest.TargetPort,
                    (int)response.StatusCode
                );
            }
        }
        catch (OperationCanceledException ex) when (requestCancellationToken.IsCancellationRequested)
        {
            if (_logger.IsEnabled(LogLevel.Debug))
            {
                _logger.LogDebug(
                    ex,
                    "App tunnel request {RequestId} for target {Target}:{TargetPort} cancelled",
                    pendingRequest.RequestId,
                    pendingRequest.Target,
                    pendingRequest.TargetPort
                );
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "App tunnel request {RequestId} failed", pendingRequest.RequestId);
            await SendFrame(
                socket,
                sendLock,
                TunnelProtocol.WriteJsonFrame(
                    TunnelFrameKind.Error,
                    new ErrorFrame(pendingRequest.RequestId, ex.Message)
                ),
                cancellationToken
            );
        }
        finally
        {
            pending.TryRemove(pendingRequest.RequestId, out _);
            pendingRequest.Cancel();
        }
    }

    private async Task<HttpResponseMessage> SendUpstreamRequest(PendingRequest pendingRequest)
    {
        var request = pendingRequest.BuildHttpRequest(ResolveTargetUri(pendingRequest));
        try
        {
            return await HttpClient.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                pendingRequest.CancellationTokenSource.Token
            );
        }
        catch
        {
            request.Dispose();
            throw;
        }
    }

    private static async Task SendBodyFrames(
        ClientWebSocket socket,
        SemaphoreSlim sendLock,
        HttpContent? content,
        TunnelFrameKind kind,
        long requestId,
        CancellationToken cancellationToken
    )
    {
        if (content is null)
        {
            await SendFrame(
                socket,
                sendLock,
                TunnelProtocol.WriteBodyFrame(kind, requestId, isFinal: true, []),
                cancellationToken
            );
            return;
        }

        await using var body = await content.ReadAsStreamAsync(cancellationToken);
        var buffer = ArrayPool<byte>.Shared.Rent(TunnelDefaults.MaxFramePayloadBytes);
        try
        {
            while (true)
            {
                var bytesRead = await body.ReadAsync(
                    buffer.AsMemory(0, TunnelDefaults.MaxFramePayloadBytes),
                    cancellationToken
                );
                if (bytesRead == 0)
                    break;

                await SendFrame(
                    socket,
                    sendLock,
                    TunnelProtocol.WriteBodyFrame(kind, requestId, isFinal: false, buffer.AsSpan(0, bytesRead)),
                    cancellationToken
                );
            }

            await SendFrame(
                socket,
                sendLock,
                TunnelProtocol.WriteBodyFrame(kind, requestId, isFinal: true, []),
                cancellationToken
            );
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(buffer);
        }
    }

    private static async Task SendFrame(
        ClientWebSocket socket,
        SemaphoreSlim sendLock,
        byte[] frame,
        CancellationToken cancellationToken
    )
    {
        await sendLock.WaitAsync(cancellationToken);
        try
        {
            await TunnelProtocol.SendFrame(socket, frame, cancellationToken);
        }
        finally
        {
            sendLock.Release();
        }
    }

    private static Dictionary<string, string[]> CollectResponseHeaders(HttpResponseMessage response)
    {
        var headers = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);
        CopyHeaders(response.Headers, headers, TunnelHttpHeaders.ShouldSkipResponseHeader);

        if (response.Content is not null)
            CopyHeaders(response.Content.Headers, headers, TunnelHttpHeaders.ShouldSkipResponseHeader);

        if (
            response.Content is not null
            && response.Headers.TransferEncodingChunked == true
            && response.Content.Headers.ContentLength is not null
        )
        {
            headers.Remove(HeaderNames.ContentLength);
        }

        if (
            response.Content is not null
            && TunnelHttpHeaders.IsBodylessStatusCode((int)response.StatusCode)
            && headers.TryGetValue(HeaderNames.ContentLength, out var contentLength)
            && contentLength.Length == 1
            && contentLength[0] == "0"
        )
        {
            headers.Remove(HeaderNames.ContentLength);
        }

        return headers;
    }

    private static Dictionary<string, string[]> CollectResponseTrailers(HttpResponseMessage response)
    {
        var headers = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);
        CopyHeaders(response.TrailingHeaders, headers, TunnelHttpHeaders.ShouldSkipResponseHeader);
        return headers;
    }

    private Uri ResolveTargetUri(PendingRequest pendingRequest)
    {
        if (
            _boundTopologyIndex.Current.ResolveHostHttpUpstream(pendingRequest.Target, pendingRequest.TargetPort) is
            { } upstream
        )
        {
            return upstream;
        }

        throw new InvalidDataException("unsupported app tunnel target");
    }

    private static void CopyHeaders(
        HttpHeaders source,
        Dictionary<string, string[]> destination,
        Func<string, bool> shouldSkip
    )
    {
        foreach (var header in source)
        {
            if (!shouldSkip(header.Key))
                destination[header.Key] = [.. header.Value];
        }
    }

    private sealed class PendingRequest
    {
        private readonly RequestStartFrame _start;
        private readonly Channel<byte[]> _body = Channel.CreateBounded<byte[]>(
            new BoundedChannelOptions(TunnelDefaults.BodyChannelCapacity)
            {
                SingleReader = true,
                SingleWriter = true,
                FullMode = BoundedChannelFullMode.Wait,
            }
        );
        private int _started;

        public PendingRequest(RequestStartFrame start)
        {
            _start = start;
            CancellationTokenSource = new CancellationTokenSource();
        }

        public long RequestId => _start.RequestId;
        public string Target => _start.Target;
        public int TargetPort => _start.TargetPort;
        public bool IsStarted => Volatile.Read(ref _started) != 0;
        public CancellationTokenSource CancellationTokenSource { get; }

        public void StartProcessing(Func<Task> process)
        {
            if (Interlocked.Exchange(ref _started, 1) != 0)
                return;

            _ = process();
        }

        public async Task AppendBody(byte[] payload, bool isFinal, CancellationToken cancellationToken)
        {
            try
            {
                if (CancellationTokenSource.IsCancellationRequested)
                    return;

                if (payload.Length > 0)
                {
                    TunnelProtocol.EnsureFrameWithinLimit(payload.Length);
                    await _body.Writer.WriteAsync(payload, cancellationToken);
                }

                if (isFinal)
                    _body.Writer.TryComplete();
            }
            catch (OperationCanceledException) when (CancellationTokenSource.IsCancellationRequested)
            {
                // The response may complete before the client has finished streaming the request body.
            }
            catch (ChannelClosedException) when (CancellationTokenSource.IsCancellationRequested)
            {
                // The response may complete before the client has finished streaming the request body.
            }
        }

        public void Cancel()
        {
            CancellationTokenSource.Cancel();
            _body.Writer.TryComplete(new OperationCanceledException());
        }

        public HttpRequestMessage BuildHttpRequest(Uri upstreamBaseUri)
        {
            var request = new HttpRequestMessage(
                new HttpMethod(_start.Method),
                new Uri(upstreamBaseUri, _start.PathAndQuery)
            );

            if (_start.HasBody)
                request.Content = new StreamingRequestContent(_body.Reader, CancellationTokenSource.Token);

            foreach (var header in _start.Headers)
            {
                if (string.Equals(header.Key, HeaderNames.Host, StringComparison.OrdinalIgnoreCase))
                {
                    if (header.Value is [var host, ..] && !string.IsNullOrWhiteSpace(host))
                    {
                        request.Headers.Host = host;
                    }
                    continue;
                }

                if (TunnelHttpHeaders.ShouldSkipRequestHeader(header.Key))
                    continue;

                if (TunnelHttpHeaders.IsContentHeader(header.Key))
                {
                    if (request.Content is not null)
                        request.Content.Headers.TryAddWithoutValidation(header.Key, header.Value);
                }
                else
                {
                    request.Headers.TryAddWithoutValidation(header.Key, header.Value);
                }
            }

            if (
                request.Content is not null
                && request.Headers.TransferEncodingChunked == true
                && request.Content.Headers.ContentLength is not null
            )
            {
                request.Content.Headers.ContentLength = null;
            }

            return request;
        }
    }

    private sealed class StreamingRequestContent : HttpContent
    {
        private readonly ChannelReader<byte[]> _body;
        private readonly CancellationToken _cancellationToken;

        public StreamingRequestContent(ChannelReader<byte[]> body, CancellationToken cancellationToken)
        {
            _body = body;
            _cancellationToken = cancellationToken;
        }

        protected override bool TryComputeLength(out long length)
        {
            length = -1;
            return false;
        }

        protected override async Task SerializeToStreamAsync(Stream stream, TransportContext? context)
        {
            await foreach (var chunk in _body.ReadAllAsync(_cancellationToken))
                await stream.WriteAsync(chunk, _cancellationToken);
        }
    }
}
