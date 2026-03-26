using System.Buffers;
using System.Collections.Concurrent;
using System.IO;
using System.Net.WebSockets;
using Altinn.Studio.AppTunnel;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.AppManager.Tunnel;

internal sealed class TunnelWorker : BackgroundService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly TunnelOptions _options;
    private readonly ILogger<TunnelWorker> _logger;

    public TunnelWorker(
        IHttpClientFactory httpClientFactory,
        IOptions<TunnelOptions> options,
        ILogger<TunnelWorker> logger
    )
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
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
                await RunConnectionAsync(stoppingToken);
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

    private async Task RunConnectionAsync(CancellationToken cancellationToken)
    {
        var tunnelUrl = _options.Url;
        if (string.IsNullOrWhiteSpace(tunnelUrl))
        {
            return;
        }

        using var socket = new ClientWebSocket();
        if (_logger.IsEnabled(LogLevel.Information))
        {
            _logger.LogInformation("Connecting app tunnel to {Url}", tunnelUrl);
        }
        var uri = new Uri(tunnelUrl, UriKind.Absolute);
        await socket.ConnectAsync(uri, cancellationToken);
        _logger.LogInformation("App tunnel connected");

        var sendLock = new SemaphoreSlim(1, 1);
        var pending = new ConcurrentDictionary<long, PendingRequest>();

        try
        {
            while (socket.State == WebSocketState.Open && !cancellationToken.IsCancellationRequested)
            {
                var message = await TunnelProtocol.ReadMessageAsync(socket, cancellationToken);
                if (message is null)
                {
                    break;
                }

                await HandleMessageAsync(socket, sendLock, pending, message, cancellationToken);
            }
        }
        finally
        {
            sendLock.Dispose();
            _logger.LogInformation("App tunnel disconnected");
        }
    }

    private async Task HandleMessageAsync(
        ClientWebSocket socket,
        SemaphoreSlim sendLock,
        ConcurrentDictionary<long, PendingRequest> pending,
        byte[] message,
        CancellationToken cancellationToken
    )
    {
        switch (TunnelProtocol.ReadKind(message))
        {
            case TunnelFrameKind.RequestStart:
            {
                var frame = TunnelProtocol.ReadJsonFrame<RequestStartFrame>(TunnelFrameKind.RequestStart, message);
                pending[frame.RequestId] = new PendingRequest(frame);
                break;
            }
            case TunnelFrameKind.RequestBody:
            {
                var frame = TunnelProtocol.ReadBodyFrame(TunnelFrameKind.RequestBody, message);
                if (pending.TryGetValue(frame.RequestId, out var request))
                {
                    var completed = request.AppendBody(frame.Payload, frame.IsFinal);
                    if (completed)
                    {
                        pending.TryRemove(frame.RequestId, out _);
                        _ = ProcessRequestAsync(socket, sendLock, request, cancellationToken);
                    }
                }
                break;
            }
            case TunnelFrameKind.Cancel:
            {
                var frame = TunnelProtocol.ReadJsonFrame<ErrorFrame>(TunnelFrameKind.Cancel, message);
                pending.TryRemove(frame.RequestId, out _);
                break;
            }
            default:
                throw new InvalidDataException("unexpected app tunnel request frame");
        }
    }

    private async Task ProcessRequestAsync(
        ClientWebSocket socket,
        SemaphoreSlim sendLock,
        PendingRequest pendingRequest,
        CancellationToken cancellationToken
    )
    {
        try
        {
            using var request = pendingRequest.BuildHttpRequest(_options.UpstreamUrl);
            using var client = _httpClientFactory.CreateClient();
            using var response = await client.SendAsync(request, cancellationToken);
            var responseBody = await response.Content.ReadAsByteArrayAsync(cancellationToken);
            TunnelProtocol.EnsureBodyWithinLimit(responseBody.Length);

            var responseStart = new ResponseStartFrame(
                pendingRequest.RequestId,
                (int)response.StatusCode,
                CollectResponseHeaders(response)
            );

            await SendFrameAsync(
                socket,
                sendLock,
                TunnelProtocol.WriteJsonFrame(TunnelFrameKind.ResponseStart, responseStart),
                cancellationToken
            );
            await SendFrameAsync(
                socket,
                sendLock,
                TunnelProtocol.WriteBodyFrame(
                    TunnelFrameKind.ResponseBody,
                    pendingRequest.RequestId,
                    isFinal: true,
                    responseBody
                ),
                cancellationToken
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "App tunnel request {RequestId} failed", pendingRequest.RequestId);
            await SendFrameAsync(
                socket,
                sendLock,
                TunnelProtocol.WriteJsonFrame(
                    TunnelFrameKind.Error,
                    new ErrorFrame(pendingRequest.RequestId, ex.Message)
                ),
                cancellationToken
            );
        }
    }

    private static async Task SendFrameAsync(
        ClientWebSocket socket,
        SemaphoreSlim sendLock,
        byte[] frame,
        CancellationToken cancellationToken
    )
    {
        await sendLock.WaitAsync(cancellationToken);
        try
        {
            await TunnelProtocol.SendFrameAsync(socket, frame, cancellationToken);
        }
        finally
        {
            sendLock.Release();
        }
    }

    private static Dictionary<string, string[]> CollectResponseHeaders(HttpResponseMessage response)
    {
        var headers = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);
        foreach (var header in response.Headers)
        {
            headers[header.Key] = [.. header.Value];
        }

        foreach (var header in response.Content.Headers)
        {
            headers[header.Key] = [.. header.Value];
        }

        return headers;
    }

    private sealed class PendingRequest
    {
        private readonly RequestStartFrame _start;
        private readonly ArrayBufferWriter<byte> _body = new();

        public PendingRequest(RequestStartFrame start)
        {
            _start = start;
        }

        public long RequestId => _start.RequestId;

        public bool AppendBody(byte[] payload, bool isFinal)
        {
            TunnelProtocol.EnsureBodyWithinLimit(checked(_body.WrittenCount + payload.Length));
            payload.CopyTo(_body.GetSpan(payload.Length));
            _body.Advance(payload.Length);
            return isFinal;
        }

        public HttpRequestMessage BuildHttpRequest(string upstreamBaseUrl)
        {
            var request = new HttpRequestMessage(
                new HttpMethod(_start.Method),
                new Uri(new Uri(upstreamBaseUrl, UriKind.Absolute), _start.PathAndQuery)
            );

            if (_body.WrittenCount > 0)
            {
                request.Content = new ByteArrayContent(_body.WrittenMemory.ToArray());
            }

            foreach (var header in _start.Headers)
            {
                if (string.Equals(header.Key, "Host", StringComparison.OrdinalIgnoreCase))
                {
                    request.Headers.Host = header.Value.FirstOrDefault();
                    continue;
                }

                if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value))
                {
                    request.Content ??= new ByteArrayContent([]);
                    request.Content.Headers.TryAddWithoutValidation(header.Key, header.Value);
                }
            }

            return request;
        }
    }
}
