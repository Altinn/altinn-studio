#nullable enable

using System.Collections.Concurrent;
using System.IO;
using System.Net;
using System.Net.WebSockets;
using Altinn.Studio.AppTunnel;

namespace LocalTest.Tunnel;

public sealed class AppTunnelClient
{
    private readonly ILogger<AppTunnelClient> _logger;
    private readonly object _sessionLock = new();
    private TunnelSession? _session;

    public AppTunnelClient(ILogger<AppTunnelClient> logger)
    {
        _logger = logger;
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

    public async Task AcceptAsync(HttpContext context, CancellationToken cancellationToken)
    {
        if (!context.WebSockets.IsWebSocketRequest)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }

        using var socket = await context.WebSockets.AcceptWebSocketAsync();
        var session = new TunnelSession(socket, _logger);
        TunnelSession? previousSession;
        lock (_sessionLock)
        {
            previousSession = _session;
            _session = session;
        }

        if (previousSession is not null)
        {
            await previousSession.DisposeAsync();
        }

        _logger.LogInformation("App tunnel connected");

        try
        {
            await session.RunReceiveLoopAsync(cancellationToken);
        }
        finally
        {
            lock (_sessionLock)
            {
                if (ReferenceEquals(_session, session))
                {
                    _session = null;
                }
            }

            _logger.LogInformation("App tunnel disconnected");
        }
    }

    public async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        TunnelSession session;
        lock (_sessionLock)
        {
            session =
                _session ?? throw new InvalidOperationException("app tunnel is not connected");
        }

        return await session.SendAsync(request, cancellationToken);
    }

    private sealed class TunnelSession : IAsyncDisposable
    {
        private readonly WebSocket _socket;
        private readonly ILogger _logger;
        private readonly SemaphoreSlim _sendLock = new(1, 1);
        private readonly ConcurrentDictionary<long, PendingResponse> _pending = new();
        private long _nextRequestId;

        public TunnelSession(WebSocket socket, ILogger logger)
        {
            _socket = socket;
            _logger = logger;
        }

        public async Task RunReceiveLoopAsync(CancellationToken cancellationToken)
        {
            try
            {
                while (_socket.State == WebSocketState.Open && !cancellationToken.IsCancellationRequested)
                {
                    var message = await TunnelProtocol.ReadMessageAsync(_socket, cancellationToken);
                    if (message is null)
                    {
                        break;
                    }

                    HandleMessage(message);
                }
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "App tunnel receive loop failed");
            }
            finally
            {
                var error = new HttpRequestException("app tunnel disconnected");
                foreach (var entry in _pending)
                {
                    entry.Value.TrySetException(error);
                }
            }
        }

        public async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            var requestId = Interlocked.Increment(ref _nextRequestId);
            var pending = new PendingResponse();
            if (!_pending.TryAdd(requestId, pending))
            {
                throw new InvalidOperationException("duplicate app tunnel request id");
            }

            using var registration = cancellationToken.Register(
                static state =>
                {
                    var tuple = ((TunnelSession Session, long RequestId))state!;
                    _ = tuple.Session.SendCancelAsync(tuple.RequestId);
                },
                (this, requestId)
            );

            try
            {
                var requestBody = await ReadRequestBodyAsync(request, cancellationToken);
                var requestStart = new RequestStartFrame(
                    requestId,
                    request.Method.Method,
                    GetPathAndQuery(request.RequestUri),
                    CollectHeaders(request)
                );

                await SendFrameAsync(
                    TunnelProtocol.WriteJsonFrame(TunnelFrameKind.RequestStart, requestStart),
                    cancellationToken
                );
                await SendFrameAsync(
                    TunnelProtocol.WriteBodyFrame(
                        TunnelFrameKind.RequestBody,
                        requestId,
                        isFinal: true,
                        requestBody
                    ),
                    cancellationToken
                );

                var response = await pending.Task.WaitAsync(cancellationToken);
                return BuildResponseMessage(response);
            }
            catch
            {
                _pending.TryRemove(requestId, out _);
                throw;
            }
        }

        public async ValueTask DisposeAsync()
        {
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
            catch
            {
            }

            _socket.Dispose();
            _sendLock.Dispose();
        }

        private void HandleMessage(byte[] message)
        {
            switch (TunnelProtocol.ReadKind(message))
            {
                case TunnelFrameKind.ResponseStart:
                {
                    var frame = TunnelProtocol.ReadJsonFrame<ResponseStartFrame>(
                        TunnelFrameKind.ResponseStart,
                        message
                    );
                    if (_pending.TryGetValue(frame.RequestId, out var pending))
                    {
                        pending.SetStart(frame);
                    }
                    break;
                }
                case TunnelFrameKind.ResponseBody:
                {
                    var frame = TunnelProtocol.ReadBodyFrame(TunnelFrameKind.ResponseBody, message);
                    if (_pending.TryGetValue(frame.RequestId, out var pending))
                    {
                        var completed = pending.AppendBody(frame.Payload, frame.IsFinal);
                        if (completed)
                        {
                            _pending.TryRemove(frame.RequestId, out _);
                        }
                    }
                    break;
                }
                case TunnelFrameKind.Error:
                {
                    var frame = TunnelProtocol.ReadJsonFrame<ErrorFrame>(TunnelFrameKind.Error, message);
                    if (_pending.TryRemove(frame.RequestId, out var pending))
                    {
                        pending.TrySetException(new HttpRequestException(frame.Message));
                    }
                    break;
                }
                default:
                    throw new InvalidDataException("unexpected app tunnel response frame");
            }
        }

        private async Task SendCancelAsync(long requestId)
        {
            if (_pending.TryRemove(requestId, out var pending))
            {
                pending.TrySetException(new OperationCanceledException());
                try
                {
                    await SendFrameAsync(
                        TunnelProtocol.WriteJsonFrame(
                            TunnelFrameKind.Cancel,
                            new ErrorFrame(requestId, "cancelled")
                        ),
                        CancellationToken.None
                    );
                }
                catch
                {
                }
            }
        }

        private async Task SendFrameAsync(byte[] frame, CancellationToken cancellationToken)
        {
            await _sendLock.WaitAsync(cancellationToken);
            try
            {
                await TunnelProtocol.SendFrameAsync(_socket, frame, cancellationToken);
            }
            finally
            {
                _sendLock.Release();
            }
        }

        private static async Task<byte[]> ReadRequestBodyAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            if (request.Content is null)
            {
                return [];
            }

            var body = await request.Content.ReadAsByteArrayAsync(cancellationToken);
            TunnelProtocol.EnsureBodyWithinLimit(body.Length);
            return body;
        }

        private static string GetPathAndQuery(Uri? requestUri)
        {
            if (requestUri is null)
            {
                throw new InvalidOperationException("tunnel request is missing uri");
            }

            return requestUri.IsAbsoluteUri ? requestUri.PathAndQuery : requestUri.OriginalString;
        }

        private static Dictionary<string, string[]> CollectHeaders(HttpRequestMessage request)
        {
            var headers = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);
            foreach (var header in request.Headers)
            {
                headers[header.Key] = [.. header.Value];
            }

            if (request.Content is not null)
            {
                foreach (var header in request.Content.Headers)
                {
                    headers[header.Key] = [.. header.Value];
                }
            }

            return headers;
        }

        private static HttpResponseMessage BuildResponseMessage(BufferedResponse response)
        {
            var message = new HttpResponseMessage((HttpStatusCode)response.StatusCode)
            {
                Content = new ByteArrayContent(response.Body),
            };

            foreach (var header in response.Headers)
            {
                if (!message.Headers.TryAddWithoutValidation(header.Key, header.Value))
                {
                    message.Content.Headers.TryAddWithoutValidation(header.Key, header.Value);
                }
            }

            return message;
        }
    }

    private sealed class PendingResponse
    {
        private readonly TaskCompletionSource<BufferedResponse> _tcs =
            new(TaskCreationOptions.RunContinuationsAsynchronously);
        private readonly MemoryStream _body = new();
        private ResponseStartFrame? _start;

        public Task<BufferedResponse> Task => _tcs.Task;

        public void SetStart(ResponseStartFrame start)
        {
            _start = start;
        }

        public bool AppendBody(byte[] payload, bool isFinal)
        {
            TunnelProtocol.EnsureBodyWithinLimit(checked((int)(_body.Length + payload.Length)));
            _body.Write(payload, 0, payload.Length);

            if (!isFinal)
            {
                return false;
            }

            if (_start is null)
            {
                _tcs.TrySetException(new InvalidDataException("response body arrived before response start"));
                return true;
            }

            _tcs.TrySetResult(new BufferedResponse(_start.StatusCode, _start.Headers, _body.ToArray()));
            return true;
        }

        public void TrySetException(Exception error)
        {
            _tcs.TrySetException(error);
        }
    }

    private sealed record BufferedResponse(
        int StatusCode,
        Dictionary<string, string[]> Headers,
        byte[] Body
    );
}
