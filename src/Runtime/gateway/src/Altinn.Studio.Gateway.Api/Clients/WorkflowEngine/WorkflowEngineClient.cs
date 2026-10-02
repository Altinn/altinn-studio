using Altinn.Studio.Gateway.Api.Settings;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Clients.WorkflowEngine;

/// <summary>
/// Thin HTTP client for the in-cluster workflow engine. The engine has no authentication of
/// its own — access control is the gateway's Maskinporten gate plus the engine NetworkPolicy —
/// so this client adds no credentials. Responses are returned unread (headers only) so the
/// caller can stream the body through unmodified.
/// </summary>
internal sealed class WorkflowEngineClient(
    IHttpClientFactory _httpClientFactory,
    IOptionsMonitor<WorkflowEngineSettings> _settings
)
{
    public const string HttpClientName = "WorkflowEngine";

    /// <summary>
    /// The per-phase upstream budget, for the caller that streams the body after
    /// <see cref="Send"/> has returned the headers.
    /// </summary>
    public TimeSpan RequestTimeout => _settings.CurrentValue.RequestTimeout;

    /// <summary>
    /// Sends a request for the given upstream path (relative to the engine base URL, already
    /// escaped), with <paramref name="content"/> as its body when there is one, and returns the
    /// response with only the headers read.
    /// </summary>
    public async Task<HttpResponseMessage> Send(
        HttpMethod method,
        string pathAndQuery,
        CancellationToken cancellationToken,
        HttpContent? content = null
    )
    {
        var client = _httpClientFactory.CreateClient(HttpClientName);
        using var request = new HttpRequestMessage(method, new Uri(pathAndQuery, UriKind.Relative));
        request.Content = content;
        return await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
    }
}
