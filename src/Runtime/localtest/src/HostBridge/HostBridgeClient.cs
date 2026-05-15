#nullable enable

using System.Buffers;
using System.Collections.Concurrent;
using System.IO;
using System.Net;
using System.Net.Http.Headers;
using System.Net.WebSockets;
using System.Threading.Channels;
using Altinn.Studio.HostBridge;
using Microsoft.Extensions.Hosting;
using Microsoft.Net.Http.Headers;

namespace LocalTest.HostBridge;

public sealed class HostBridgeClient
{
    private readonly ILogger<HostBridgeClient> _logger;
    private readonly object _sessionLock = new();
    private HostBridgeSession? _session;

    public HostBridgeClient(
        ILogger<HostBridgeClient> logger,
        IHostApplicationLifetime applicationLifetime
    )
    {
        _logger = logger;
        applicationLifetime.ApplicationStopping.Register(Stop);
    }

    public bool IsConnected
    {
        get
        {
            lock (_sessionLock)
            {
                return _session is not null;
            }
        }
    }

    public async Task Accept(HttpContext context, CancellationToken cancellationToken)
    {
        if (!context.WebSockets.IsWebSocketRequest)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }

        var session = new HostBridgeSession(await context.WebSockets.AcceptWebSocketAsync(), _logger);
        HostBridgeSession? previousSession;
        lock (_sessionLock)
        {
            previousSession = _session;
            _session = session;
        }

        if (previousSession is not null)
            await previousSession.CloseAsync();

        _logger.LogInformation("Host bridge connected");

        try
        {
            await session.RunReceiveLoop(cancellationToken);
        }
        finally
        {
            lock (_sessionLock)
            {
                if (ReferenceEquals(_session, session))
                    _session = null;
            }

            await session.CloseAsync();
            _logger.LogInformation("Host bridge disconnected");
        }
    }

    public async Task<HttpResponseMessage> SendToTarget(
        HttpRequestMessage request,
        string target,
        int targetPort,
        CancellationToken cancellationToken
    )
    {
        var session = GetSession();
        return await session.Send(request, target, targetPort, cancellationToken);
    }

    public async Task ProxyToTarget(
        HttpRequestMessage request,
        string target,
        int targetPort,
        HttpContext context,
        CancellationToken cancellationToken
    )
    {
        var session = GetSession();
        await session.Proxy(request, target, targetPort, context, cancellationToken);
    }

    private void Stop()
    {
        HostBridgeSession? session;
        lock (_sessionLock)
        {
            session = _session;
            _session = null;
        }

        session?.Abort();
    }

    private HostBridgeSession GetSession()
    {
        lock (_sessionLock)
        {
            return _session ?? throw new InvalidOperationException("host bridge is not connected");
        }
    }

    private sealed class HostBridgeSession
    {
        private readonly WebSocket _socket;
        private readonly ILogger _logger;
        private readonly SemaphoreSlim _sendLock = new(1, 1);
        private readonly ConcurrentDictionary<long, PendingResponse> _pending = new();
        private long _nextRequestId;
        private int _disposed;

        public HostBridgeSession(WebSocket socket, ILogger logger)
        {
            _socket = socket;
            _logger = logger;
        }

        public async Task RunReceiveLoop(CancellationToken cancellationToken)
        {
            var receiveBuffer = new byte[8192];
            var messageBuffer = new ArrayBufferWriter<byte>(8192);

            try
            {
                while (_socket.State == WebSocketState.Open && !cancellationToken.IsCancellationRequested)
                {
                    if (!await HostBridgeProtocol.ReadMessage(_socket, receiveBuffer, messageBuffer, cancellationToken))
                        break;

                    await HandleMessage(messageBuffer.WrittenMemory, cancellationToken);
                }
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Host bridge receive loop failed");
            }
            finally
            {
                var error = new HttpRequestException("host bridge disconnected");
                foreach (var entry in _pending)
                    if (_pending.TryRemove(entry.Key, out var pending))
                        pending.TrySetException(error);
            }
        }

        public async Task<HttpResponseMessage> Send(
            HttpRequestMessage request,
            string target,
            int targetPort,
            CancellationToken cancellationToken
        )
        {
            var requestId = Interlocked.Increment(ref _nextRequestId);
            var pending = new PendingResponse();
            if (!_pending.TryAdd(requestId, pending))
                throw new InvalidOperationException("duplicate host bridge request id");

            using var registration = RegisterCancellation(cancellationToken, requestId);

            try
            {
                await SendRequest(request, target, targetPort, requestId, cancellationToken);

                var start = await pending.Start.WaitAsync(cancellationToken);
                var body = await ReadBufferedBody(pending, cancellationToken);
                var trailers = await pending.Trailers.WaitAsync(cancellationToken);
                _pending.TryRemove(requestId, out _);
                return BuildResponseMessage(start, body, trailers);
            }
            catch
            {
                _pending.TryRemove(requestId, out _);
                throw;
            }
        }

        public async Task Proxy(
            HttpRequestMessage request,
            string target,
            int targetPort,
            HttpContext context,
            CancellationToken cancellationToken
        )
        {
            var requestId = Interlocked.Increment(ref _nextRequestId);
            var pending = new PendingResponse();
            if (!_pending.TryAdd(requestId, pending))
                throw new InvalidOperationException("duplicate host bridge request id");

            using var registration = RegisterCancellation(cancellationToken, requestId);

            try
            {
                await SendRequest(request, target, targetPort, requestId, cancellationToken);

                var start = await pending.Start.WaitAsync(cancellationToken);
                context.Response.StatusCode = start.StatusCode;
                CopyResponseHeaders(context, start);

                await foreach (var chunk in pending.Body.ReadAllAsync(cancellationToken))
                    await context.Response.Body.WriteAsync(chunk, cancellationToken);

                var trailers = await pending.Trailers.WaitAsync(cancellationToken);
                AppendResponseTrailers(context, trailers);
                _pending.TryRemove(requestId, out _);
            }
            catch
            {
                _pending.TryRemove(requestId, out _);
                throw;
            }
        }

        public async Task CloseAsync()
        {
            if (Interlocked.Exchange(ref _disposed, 1) != 0)
                return;

            try
            {
                if (_socket.State == WebSocketState.Open || _socket.State == WebSocketState.CloseReceived)
                {
                    await _socket.CloseAsync(
                        WebSocketCloseStatus.NormalClosure,
                        "closing",
                        CancellationToken.None
                    );
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to close host bridge session gracefully");
            }
            finally
            {
                DisposeResources();
            }
        }

        public void Abort()
        {
            if (Interlocked.Exchange(ref _disposed, 1) != 0)
                return;

            try
            {
                _socket.Abort();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to abort host bridge session");
            }

            DisposeResources();
        }

        private void DisposeResources()
        {
            _socket.Dispose();
            _sendLock.Dispose();
        }

        private async Task HandleMessage(ReadOnlyMemory<byte> message, CancellationToken cancellationToken)
        {
            switch (HostBridgeProtocol.ReadKind(message.Span))
            {
                case HostBridgeFrameKind.ResponseStart:
                {
                    var frame = HostBridgeProtocol.ReadJsonFrame<ResponseStartFrame>(
                        HostBridgeFrameKind.ResponseStart,
                        message.Span
                    );
                    if (_pending.TryGetValue(frame.RequestId, out var pending))
                        pending.SetStart(frame);
                    break;
                }
                case HostBridgeFrameKind.ResponseBody:
                {
                    var frame = HostBridgeProtocol.ReadBodyFrame(HostBridgeFrameKind.ResponseBody, message.Span);
                    if (_pending.TryGetValue(frame.RequestId, out var pending))
                        await pending.AppendBody(frame.Payload, frame.IsFinal, cancellationToken);
                    break;
                }
                case HostBridgeFrameKind.ResponseTrailers:
                {
                    var frame = HostBridgeProtocol.ReadJsonFrame<HeadersFrame>(
                        HostBridgeFrameKind.ResponseTrailers,
                        message.Span
                    );
                    if (_pending.TryGetValue(frame.RequestId, out var pending))
                        pending.SetTrailers(frame.Headers);
                    break;
                }
                case HostBridgeFrameKind.Error:
                {
                    var frame = HostBridgeProtocol.ReadJsonFrame<ErrorFrame>(HostBridgeFrameKind.Error, message.Span);
                    if (_pending.TryRemove(frame.RequestId, out var pending))
                        pending.TrySetException(new HttpRequestException(frame.Message));
                    break;
                }
                default:
                    throw new InvalidDataException("unexpected host bridge response frame");
            }
        }

        private IDisposable RegisterCancellation(CancellationToken cancellationToken, long requestId)
        {
            return cancellationToken.Register(
                static state =>
                {
                    var tuple = ((HostBridgeSession Session, long RequestId))state!;
                    _ = tuple.Session.SendCancel(tuple.RequestId);
                },
                (this, requestId)
            );
        }

        private async Task SendRequest(
            HttpRequestMessage request,
            string target,
            int targetPort,
            long requestId,
            CancellationToken cancellationToken
        )
        {
            var requestStart = new RequestStartFrame(
                requestId,
                request.Method.Method,
                GetPathAndQuery(request.RequestUri),
                CollectHeaders(request),
                request.Content is not null,
                target,
                targetPort
            );

            await SendFrame(
                HostBridgeProtocol.WriteJsonFrame(HostBridgeFrameKind.RequestStart, requestStart),
                cancellationToken
            );
            await SendBodyFrames(request.Content, HostBridgeFrameKind.RequestBody, requestId, cancellationToken);
        }

        private async Task SendBodyFrames(
            HttpContent? content,
            HostBridgeFrameKind kind,
            long requestId,
            CancellationToken cancellationToken
        )
        {
            if (content is null)
            {
                await SendFrame(
                    HostBridgeProtocol.WriteBodyFrame(kind, requestId, isFinal: true, []),
                    cancellationToken
                );
                return;
            }

            await using var body = await content.ReadAsStreamAsync(cancellationToken);
            var buffer = ArrayPool<byte>.Shared.Rent(HostBridgeDefaults.MaxFramePayloadBytes);
            try
            {
                while (true)
                {
                    var bytesRead = await body.ReadAsync(
                        buffer.AsMemory(0, HostBridgeDefaults.MaxFramePayloadBytes),
                        cancellationToken
                    );
                    if (bytesRead == 0)
                        break;

                    await SendFrame(
                        HostBridgeProtocol.WriteBodyFrame(kind, requestId, isFinal: false, buffer.AsSpan(0, bytesRead)),
                        cancellationToken
                    );
                }

                await SendFrame(
                    HostBridgeProtocol.WriteBodyFrame(kind, requestId, isFinal: true, []),
                    cancellationToken
                );
            }
            finally
            {
                ArrayPool<byte>.Shared.Return(buffer);
            }
        }

        private async Task SendCancel(long requestId)
        {
            if (_pending.TryRemove(requestId, out var pending))
            {
                pending.TrySetException(new OperationCanceledException());
                try
                {
                    await SendFrame(
                        HostBridgeProtocol.WriteJsonFrame(
                            HostBridgeFrameKind.Cancel,
                            new ErrorFrame(requestId, "cancelled")
                        ),
                        CancellationToken.None
                    );
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to send host bridge cancel frame for request {RequestId}", requestId);
                }
            }
        }

        private async Task SendFrame(byte[] frame, CancellationToken cancellationToken)
        {
            await _sendLock.WaitAsync(cancellationToken);
            try
            {
                await HostBridgeProtocol.SendFrame(_socket, frame, cancellationToken);
            }
            finally
            {
                _sendLock.Release();
            }
        }

        private static async Task<byte[]> ReadBufferedBody(
            PendingResponse pending,
            CancellationToken cancellationToken
        )
        {
            using var buffer = new MemoryStream();
            await foreach (var chunk in pending.Body.ReadAllAsync(cancellationToken))
                await buffer.WriteAsync(chunk, cancellationToken);
            return buffer.ToArray();
        }

        private static string GetPathAndQuery(Uri? requestUri)
        {
            if (requestUri is null)
                throw new InvalidOperationException("host bridge request is missing uri");

            return requestUri.IsAbsoluteUri ? requestUri.PathAndQuery : requestUri.OriginalString;
        }

        private static Dictionary<string, string[]> CollectHeaders(HttpRequestMessage request)
        {
            var headers = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);
            if (!string.IsNullOrWhiteSpace(request.Headers.Host))
                headers[HeaderNames.Host] = [request.Headers.Host];

            foreach (var header in request.Headers)
            {
                if (!HostBridgeHttpHeaders.ShouldSkipRequestHeader(header.Key))
                    headers[header.Key] = [.. header.Value];
            }

            if (request.Content is not null)
            {
                foreach (var header in request.Content.Headers)
                {
                    if (!HostBridgeHttpHeaders.ShouldSkipRequestHeader(header.Key))
                        headers[header.Key] = [.. header.Value];
                }
            }

            return headers;
        }

        private static HttpResponseMessage BuildResponseMessage(
            ResponseStartFrame response,
            byte[] body,
            Dictionary<string, string[]> trailers
        )
        {
            var message = new HttpResponseMessage((HttpStatusCode)response.StatusCode)
            {
                Content = new ByteArrayContent(body),
            };

            foreach (var header in response.Headers)
            {
                if (HostBridgeHttpHeaders.IsContentHeader(header.Key))
                {
                    message.Content.Headers.TryAddWithoutValidation(header.Key, header.Value);
                }
                else
                {
                    message.Headers.TryAddWithoutValidation(header.Key, header.Value);
                }
            }

            foreach (var trailer in trailers)
                message.TrailingHeaders.TryAddWithoutValidation(trailer.Key, trailer.Value);

            return message;
        }

        private static void CopyResponseHeaders(HttpContext context, ResponseStartFrame response)
        {
            var hasTransferEncoding = false;
            var hasContentLength = false;

            foreach (var header in response.Headers)
            {
                if (HostBridgeHttpHeaders.ShouldSkipResponseHeader(header.Key))
                    continue;

                context.Response.Headers[header.Key] = header.Value;
                hasTransferEncoding |= string.Equals(header.Key, HeaderNames.TransferEncoding, StringComparison.OrdinalIgnoreCase);
                hasContentLength |= string.Equals(header.Key, HeaderNames.ContentLength, StringComparison.OrdinalIgnoreCase);
            }

            context.Response.Headers.Remove(HeaderNames.TransferEncoding);

            if (hasTransferEncoding && hasContentLength)
                context.Response.Headers.Remove(HeaderNames.ContentLength);

            if (
                HostBridgeHttpHeaders.IsBodylessStatusCode(response.StatusCode)
                && context.Response.Headers[HeaderNames.ContentLength] == "0"
            )
            {
                context.Response.Headers.Remove(HeaderNames.ContentLength);
            }
        }

        private static void AppendResponseTrailers(
            HttpContext context,
            Dictionary<string, string[]> trailers
        )
        {
            if (!context.Response.SupportsTrailers() || trailers.Count == 0)
                return;

            foreach (var trailer in trailers)
                context.Response.AppendTrailer(trailer.Key, trailer.Value);
        }
    }

    private sealed class PendingResponse
    {
        private readonly TaskCompletionSource<ResponseStartFrame> _start =
            new(TaskCreationOptions.RunContinuationsAsynchronously);
        private readonly TaskCompletionSource<Dictionary<string, string[]>> _trailers =
            new(TaskCreationOptions.RunContinuationsAsynchronously);
        private readonly Channel<byte[]> _body = Channel.CreateBounded<byte[]>(
            new BoundedChannelOptions(HostBridgeDefaults.BodyChannelCapacity)
            {
                SingleReader = true,
                SingleWriter = true,
                FullMode = BoundedChannelFullMode.Wait,
            }
        );

        public Task<ResponseStartFrame> Start => _start.Task;
        public ChannelReader<byte[]> Body => _body.Reader;
        public Task<Dictionary<string, string[]>> Trailers => _trailers.Task;

        public void SetStart(ResponseStartFrame start)
        {
            _start.TrySetResult(start);
        }

        public async Task AppendBody(byte[] payload, bool isFinal, CancellationToken cancellationToken)
        {
            if (payload.Length > 0)
            {
                HostBridgeProtocol.EnsureFrameWithinLimit(payload.Length);
                await _body.Writer.WriteAsync(payload, cancellationToken);
            }

            if (isFinal)
                _body.Writer.TryComplete();
        }

        public void SetTrailers(Dictionary<string, string[]> trailers)
        {
            _trailers.TrySetResult(trailers);
        }

        public void TrySetException(Exception error)
        {
            _start.TrySetException(error);
            _body.Writer.TryComplete(error);
            _trailers.TrySetException(error);
        }
    }
}
