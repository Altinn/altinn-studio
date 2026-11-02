using System.Net;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Infrastructure.Clients.Authorization;

/// <summary>
/// A <see cref="DelegatingHandler"/> that sends a request to the PDP once more when the first attempt fails
/// with a network error or a 502, 503 or 504 response.
/// A decision request is safe to repeat: at most the PDP logs one more audit event for it.
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
        try
        {
            HttpResponseMessage response = await base.SendAsync(request, cancellationToken);
            if (!IsTransientStatusCode(response.StatusCode))
            {
                return response;
            }

            _logger.LogWarning("PDP returned {StatusCode}, retrying once", (int)response.StatusCode);
            response.Dispose();
        }
        catch (HttpRequestException e)
        {
            _logger.LogWarning(e, "Request to PDP failed, retrying once");
        }

        // A request the caller has given up on is not sent again
        cancellationToken.ThrowIfCancellationRequested();
        return await base.SendAsync(request, cancellationToken);
    }

    private static bool IsTransientStatusCode(HttpStatusCode statusCode) =>
        statusCode is HttpStatusCode.BadGateway or HttpStatusCode.ServiceUnavailable or HttpStatusCode.GatewayTimeout;
}
