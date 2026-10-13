#nullable disable
using System;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Rest.TransientFaultHandling;

namespace Altinn.Studio.Designer.TypedHttpClients.DelegatingHandlers;

/// <summary>
/// Delegating handler that ensures response success status code
/// </summary>
public class EnsureSuccessHandler : DelegatingHandler
{
    private readonly ILogger<EnsureSuccessHandler> _logger;

    /// <summary>
    /// Constructor to inject logger
    /// </summary>
    /// <param name="logger">ILogger instance</param>
    public EnsureSuccessHandler(ILogger<EnsureSuccessHandler> logger = null)
    {
        _logger = logger;
    }

    /// <summary>
    /// Checks to see if response is success
    /// Otherwise, throws Exception
    /// </summary>
    /// <param name="request">System.Net.Http.HttpResponseMessage</param>
    /// <param name="cancellationToken">System.Threading.CancellationToken</param>
    /// <returns>HttpResponseMessage</returns>
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        HttpResponseMessage response = await base.SendAsync(request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            // A 4xx is often expected, such as a 404 the caller handles. The exception is recorded on the request's
            // root span if nothing handles it.
            if (response.StatusCode >= HttpStatusCode.InternalServerError)
            {
                LogFailure(request, response);
            }

            throw new HttpRequestWithStatusException(response.ReasonPhrase) { StatusCode = response.StatusCode };
        }

        return response;
    }

    private void LogFailure(HttpRequestMessage request, HttpResponseMessage response) =>
        _logger.LogError(
            "// EnsureSuccessHandler // SendAsync // {Method} request to {RequestUrl} failed with status code {StatusCode}.",
            request.Method,
            request.RequestUri?.GetComponents(UriComponents.SchemeAndServer | UriComponents.Path, UriFormat.UriEscaped),
            response.StatusCode
        );
}
