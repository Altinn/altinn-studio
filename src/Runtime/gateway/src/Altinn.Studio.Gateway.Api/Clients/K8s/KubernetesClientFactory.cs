using System.Net.Sockets;
using k8s;
using Microsoft.Extensions.Http.Resilience;
using Polly;
using Polly.Retry;

namespace Altinn.Studio.Gateway.Api.Clients.K8s;

/// <summary>
/// Creates the Kubernetes client with the connection handling of client-go, which Kubernetes' own components use.
/// The C# client's defaults keep using a broken connection to the API server and never retry.
/// </summary>
internal static class KubernetesClientFactory
{
    /// <summary>
    /// client-go's HTTP/2 health check pings a connection after 30 seconds without a frame from the API server, and
    /// drops it when the ping goes unanswered for 15, which fails the requests on it so that reads are retried on a
    /// new connection. The C# client pings only while a request is in flight, after 3 minutes, so a request on a
    /// silently broken connection hangs until its 100-second timeout.
    /// </summary>
    internal static readonly TimeSpan KeepAlivePingDelay = TimeSpan.FromSeconds(30);

    /// <inheritdoc cref="KeepAlivePingDelay"/>
    internal static readonly TimeSpan KeepAlivePingTimeout = TimeSpan.FromSeconds(15);

    /// <summary>
    /// HTTP/2 keeps the gateway on one API server instance for as long as the connection lasts. Reconnecting spreads
    /// the requests across instances and moves them off one that is being replaced.
    /// </summary>
    internal static readonly TimeSpan ConnectionLifetime = TimeSpan.FromMinutes(5);

    internal static readonly TimeSpan ConnectTimeout = TimeSpan.FromSeconds(5);

    /// <summary>
    /// client-go retries a GET that failed on its connection, since a read is safe to repeat. Writes are not retried,
    /// since the API server may have applied one whose response was lost. There is no timeout per attempt: cancelling
    /// a request leaves its connection in the pool, so the retry would wait on the same stalled connection.
    /// </summary>
    internal const int MaxReadRetries = 2;

    private static readonly TimeSpan ReadRetryDelay = TimeSpan.FromMilliseconds(100);

    /// <summary>
    /// Creates the client for the cluster the gateway runs in.
    /// </summary>
    public static Kubernetes CreateInCluster() => Create(KubernetesClientConfiguration.InClusterConfig());

    /// <param name="config">Where the API server is and how to authenticate to it.</param>
    /// <param name="handlers">Handlers between the retries and the connection, such as a test's fake API server.</param>
    internal static Kubernetes Create(KubernetesClientConfiguration config, params DelegatingHandler[] handlers)
    {
        config.FirstMessageHandlerSetup = ConfigureConnections;
#pragma warning disable CA2000 // The client disposes its first handler, which disposes the handlers inside it.
        return new Kubernetes(config, [CreateReadRetryHandler(), new ReadBufferingHandler(), .. handlers]);
#pragma warning restore CA2000
    }

    private static void ConfigureConnections(SocketsHttpHandler handler)
    {
        handler.KeepAlivePingPolicy = HttpKeepAlivePingPolicy.Always;
        handler.KeepAlivePingDelay = KeepAlivePingDelay;
        handler.KeepAlivePingTimeout = KeepAlivePingTimeout;
        handler.PooledConnectionLifetime = ConnectionLifetime;
        handler.ConnectTimeout = ConnectTimeout;
    }

    private static ResilienceHandler CreateReadRetryHandler() =>
        new(
            new ResiliencePipelineBuilder<HttpResponseMessage>()
                .AddRetry(
                    new RetryStrategyOptions<HttpResponseMessage>
                    {
                        MaxRetryAttempts = MaxReadRetries,
                        Delay = ReadRetryDelay,
                        BackoffType = DelayBackoffType.Exponential,
                        UseJitter = true,
                        ShouldHandle = args =>
                            ValueTask.FromResult(IsRead(args.Context) && IsBrokenConnection(args.Outcome.Exception)),
                    }
                )
                .Build()
        );

    private static bool IsRead(ResilienceContext context) => context.GetRequestMessage()?.Method == HttpMethod.Get;

    /// <summary>
    /// Whether the request failed on its connection rather than in the API server: the connection could not be
    /// opened, closed or was reset under the request, broke its HTTP/2 framing or missed its health check. .NET wraps
    /// the failure differently depending on when it happened, and reports a reset only as the innermost socket error.
    /// </summary>
    internal static bool IsBrokenConnection(Exception? exception)
    {
        for (var current = exception; current is not null; current = current.InnerException)
        {
            var broken = current switch
            {
                HttpRequestException requestException => IsConnectionError(requestException.HttpRequestError),
                HttpIOException ioException => IsConnectionError(ioException.HttpRequestError),
                SocketException socketException => socketException.SocketErrorCode
                    is SocketError.ConnectionReset
                        or SocketError.ConnectionAborted,
                _ => false,
            };
            if (broken)
                return true;
        }

        return false;
    }

    private static bool IsConnectionError(HttpRequestError error) =>
        error
            is HttpRequestError.ConnectionError
                or HttpRequestError.ResponseEnded
                or HttpRequestError.HttpProtocolError;

    /// <summary>
    /// Reads the body of a read's response before returning it, so that a connection that breaks while the body
    /// arrives fails inside the retries. Watches stream their body for as long as they last.
    /// </summary>
    private sealed class ReadBufferingHandler : DelegatingHandler
    {
        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            var response = await base.SendAsync(request, cancellationToken);
            if (request.Method != HttpMethod.Get || IsWatch(request.RequestUri))
                return response;

            try
            {
                await response.Content.LoadIntoBufferAsync(cancellationToken);
                return response;
            }
            catch
            {
                response.Dispose();
                throw;
            }
        }

        private static bool IsWatch(Uri? uri) => uri?.Query.TrimStart('?').Split('&').Contains("watch=true") == true;
    }
}
