using System.Net;
using System.Net.Http.Headers;

namespace Altinn.Studio.Fleet.Http;

/// <summary>Creates the HTTP client a sync uses for every request.</summary>
public static class FleetHttp
{
    /// <summary>
    /// Creates a client over one shared connection pool, which speaks HTTP/2 where the server offers it and retries
    /// transient failures as <paramref name="retry"/> says.
    /// </summary>
    /// <param name="version">The tool's version, for the User-Agent.</param>
    /// <param name="retry">How to retry, or the defaults.</param>
    /// <param name="innerHandler">The handler that sends requests, or one over sockets. Tests pass a fake.</param>
    public static HttpClient CreateClient(
        string version,
        RetryPolicy? retry = null,
        HttpMessageHandler? innerHandler = null
    )
    {
        var handler = new RetryHandler(retry ?? RetryPolicy.Default)
        {
            InnerHandler = innerHandler ?? CreateSocketsHandler(),
        };
        var client = new HttpClient(handler, disposeHandler: true)
        {
            // Each request has its own timeout until its headers arrive, and archives stream for as long as they need.
            Timeout = Timeout.InfiniteTimeSpan,
            DefaultRequestVersion = HttpVersion.Version20,
            DefaultVersionPolicy = HttpVersionPolicy.RequestVersionOrLower,
        };
        client.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("altinn-fleet", SafeVersion(version)));
        return client;
    }

    private static SocketsHttpHandler CreateSocketsHandler() =>
        new()
        {
            AutomaticDecompression = DecompressionMethods.All,
            ConnectTimeout = TimeSpan.FromSeconds(15),
            PooledConnectionLifetime = TimeSpan.FromMinutes(5),
            PooledConnectionIdleTimeout = TimeSpan.FromSeconds(60),
            MaxConnectionsPerServer = 32,
            EnableMultipleHttp2Connections = true,
            AllowAutoRedirect = true,
            MaxAutomaticRedirections = 5,
        };

    private static string SafeVersion(string version)
    {
        int plus = version.IndexOf('+', StringComparison.Ordinal);
        string trimmed = plus < 0 ? version : version[..plus];
        return trimmed.Length == 0 || trimmed.Any(c => !char.IsAsciiLetterOrDigit(c) && c is not ('.' or '-'))
            ? "dev"
            : trimmed;
    }
}

/// <summary>How a sync retries requests that fail for reasons that may pass.</summary>
/// <param name="MaxAttempts">How many times to send a request, the first time included.</param>
/// <param name="BaseDelay">The wait before the first retry, which doubles for each one after it.</param>
/// <param name="MaxDelay">The longest wait, also for a server's <c>Retry-After</c>.</param>
/// <param name="AttemptTimeout">How long to wait for a response's headers.</param>
public sealed record RetryPolicy(int MaxAttempts, TimeSpan BaseDelay, TimeSpan MaxDelay, TimeSpan AttemptTimeout)
{
    /// <summary>Three attempts, half a second apart and doubling, with 30 seconds for headers.</summary>
    public static RetryPolicy Default { get; } =
        new(3, TimeSpan.FromMilliseconds(500), TimeSpan.FromSeconds(20), TimeSpan.FromSeconds(30));
}

/// <summary>
/// Retries a request on a network error other than a name that does not resolve, a timeout, 429 and 5xx, with
/// exponential backoff and jitter. A request with content is retried too, since every request a sync sends only reads.
/// </summary>
internal sealed class RetryHandler(RetryPolicy policy) : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        // Buffered so the content can be sent again.
        byte[]? content = request.Content is null
            ? null
            : await request.Content.ReadAsByteArrayAsync(cancellationToken);
        MediaTypeHeaderValue? contentType = request.Content?.Headers.ContentType;

        for (int attempt = 1; ; attempt++)
        {
            if (content is not null && attempt > 1)
            {
                request.Content = new ByteArrayContent(content);
                request.Content.Headers.ContentType = contentType;
            }

            bool last = attempt >= policy.MaxAttempts;
            TimeSpan? retryAfter = null;
            using (var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken))
            {
                timeout.CancelAfter(policy.AttemptTimeout);
                try
                {
                    HttpResponseMessage response = await base.SendAsync(request, timeout.Token);
                    if (last || !IsTransient(response.StatusCode))
                    {
                        return response;
                    }

                    retryAfter = response.Headers.RetryAfter?.Delta;
                    response.Dispose();
                }
                catch (HttpRequestException ex)
                    when (!last && !cancellationToken.IsCancellationRequested && !IsLasting(ex)) { }
                catch (OperationCanceledException) when (!last && !cancellationToken.IsCancellationRequested)
                {
                    // The attempt timed out.
                }
                catch (OperationCanceledException ex) when (!cancellationToken.IsCancellationRequested)
                {
                    throw new HttpRequestException(
                        $"No response from {request.RequestUri?.Host} within {policy.AttemptTimeout.TotalSeconds:0} s.",
                        ex
                    );
                }
            }

            await Task.Delay(Delay(attempt, retryAfter), cancellationToken);
        }
    }

    // A host name that does not resolve, such as a service owner without a cluster, will not resolve a second later.
    private static bool IsLasting(HttpRequestException exception) =>
        exception.HttpRequestError is HttpRequestError.NameResolutionError;

    internal static bool IsTransient(HttpStatusCode status) =>
        status is HttpStatusCode.TooManyRequests or HttpStatusCode.RequestTimeout || (int)status >= 500;

    private TimeSpan Delay(int attempt, TimeSpan? retryAfter)
    {
        if (policy.BaseDelay <= TimeSpan.Zero)
        {
            return TimeSpan.Zero;
        }

        double backoff = policy.BaseDelay.TotalMilliseconds * Math.Pow(2, attempt - 1);
        double jitter = Random.Shared.NextDouble() * policy.BaseDelay.TotalMilliseconds;
        TimeSpan delay = retryAfter ?? TimeSpan.FromMilliseconds(backoff + jitter);
        return delay > policy.MaxDelay ? policy.MaxDelay : delay;
    }
}
