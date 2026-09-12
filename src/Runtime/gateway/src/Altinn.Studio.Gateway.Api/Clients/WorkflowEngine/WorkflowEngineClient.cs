namespace Altinn.Studio.Gateway.Api.Clients.WorkflowEngine;

/// <summary>
/// Thin HTTP client for the in-cluster workflow engine. The engine has no authentication of
/// its own — access control is the gateway's Maskinporten gate plus the engine NetworkPolicy —
/// so this client adds no credentials. Responses are returned unread (headers only) so the
/// caller can stream the body through unmodified.
/// </summary>
internal sealed class WorkflowEngineClient(IHttpClientFactory _httpClientFactory)
{
    public const string HttpClientName = "WorkflowEngine";

    /// <summary>
    /// Sends a request for the given upstream path (relative to the engine base URL, already
    /// escaped) and returns the response with only the headers read.
    /// </summary>
    public async Task<HttpResponseMessage> Send(
        HttpMethod method,
        string pathAndQuery,
        CancellationToken cancellationToken
    )
    {
        var client = _httpClientFactory.CreateClient(HttpClientName);
        using var request = new HttpRequestMessage(method, new Uri(pathAndQuery, UriKind.Relative));
        return await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
    }
}
