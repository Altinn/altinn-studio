using System.Net;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Infrastructure.Clients.Authorization;

/// <summary>
/// A <see cref="DelegatingHandler"/> that sends a request to the PDP once more when the first attempt fails
/// with a network error or a 502, 503 or 504 response.
/// A decision request is safe to repeat: at most the PDP logs one more audit event for it.
/// The handler sends the same request message twice, so its content must be readable twice, as the
/// <see cref="StringContent"/> that <c>AuthorizationApiClient</c> sends is.
/// </summary>
internal sealed class PdpRetryDelegatingHandler : DelegatingHandler
{
    private readonly ILogger<PdpRetryDelegatingHandler> _logger;

    /// <summary>
    /// Creates a new instance of <see cref="PdpRetryDelegatingHandler"/>.
    /// </summary>
    /// <param name="logger">The logger</param>
    public PdpRetryDelegatingHandler(ILogger<PdpRetryDelegatingHandler> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc/>
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        HttpResponseMessage? response = null;
        try
        {
            response = await base.SendAsync(request, cancellationToken);
            if (!IsTransientStatusCode(response.StatusCode))
            {
                // HttpClient reads the body only after this handler has returned, too late to retry
                // when the connection drops while the body is read
                await response.Content.LoadIntoBufferAsync(cancellationToken);
                return response;
            }

            _logger.LogWarning("PDP returned {StatusCode}, retrying once", (int)response.StatusCode);
        }
        catch (HttpRequestException e)
        {
            _logger.LogWarning(e, "Request to PDP failed, retrying once");
        }
        catch
        {
            response?.Dispose();
            throw;
        }

        response?.Dispose();

        // When the caller has canceled or HttpClient.Timeout has run out, nobody waits for a second attempt
        cancellationToken.ThrowIfCancellationRequested();
        return await base.SendAsync(request, cancellationToken);
    }

    private static bool IsTransientStatusCode(HttpStatusCode statusCode) =>
        statusCode is HttpStatusCode.BadGateway or HttpStatusCode.ServiceUnavailable or HttpStatusCode.GatewayTimeout;
}
