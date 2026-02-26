using System.Net.Http.Headers;

namespace Altinn.App.Core.Extensions;

/// <summary>
/// This extension is created to make it easy to add a bearer token to a HttpRequests.
/// </summary>
public static class HttpClientExtension
{
    /// <summary>
    /// Extension that add authorization header to request
    /// </summary>
    /// <param name="httpClient">The HttpClient</param>
    /// <param name="authorizationToken">the authorization token (jwt)</param>
    /// <param name="requestUri">The request Uri</param>
    /// <param name="content">The http content</param>
    /// <param name="platformAccessToken">The platformAccess tokens</param>
    /// <param name="cancellationToken">The cancellation token</param>
    /// <returns>A HttpResponseMessage</returns>
    public static async Task<HttpResponseMessage> PostAsync(
        this HttpClient httpClient,
        string authorizationToken,
        string requestUri,
        HttpContent? content,
        string? platformAccessToken = null,
        CancellationToken cancellationToken = default
    )
    {
        using HttpRequestMessage request = new(HttpMethod.Post, requestUri);
        request.Content = content;

        request.Headers.Authorization = new AuthenticationHeaderValue(
            Constants.AuthorizationSchemes.Bearer,
            authorizationToken
        );

        if (!string.IsNullOrEmpty(platformAccessToken))
        {
            request.Headers.Add(Constants.General.PlatformAccessTokenHeaderName, platformAccessToken);
        }

        return await httpClient.SendAsync(request, cancellationToken);
    }

    /// <summary>
    /// Extension that add authorization header to request
    /// </summary>
    /// <param name="httpClient">The HttpClient</param>
    /// <param name="authorizationToken">the authorization token (jwt)</param>
    /// <param name="requestUri">The request Uri</param>
    /// <param name="content">The http content</param>
    /// <param name="platformAccessToken">The platformAccess tokens</param>
    /// <param name="cancellationToken">The cancellation token</param>
    /// <returns>A HttpResponseMessage</returns>
    public static async Task<HttpResponseMessage> PutAsync(
        this HttpClient httpClient,
        string authorizationToken,
        string requestUri,
        HttpContent? content,
        string? platformAccessToken = null,
        CancellationToken cancellationToken = default
    )
    {
        using HttpRequestMessage request = new(HttpMethod.Put, requestUri);
        request.Content = content;

        request.Headers.Authorization = new AuthenticationHeaderValue(
            Constants.AuthorizationSchemes.Bearer,
            authorizationToken
        );

        if (!string.IsNullOrEmpty(platformAccessToken))
        {
            request.Headers.Add(Constants.General.PlatformAccessTokenHeaderName, platformAccessToken);
        }

        return await httpClient.SendAsync(request, cancellationToken);
    }

    /// <summary>
    /// Extension that add authorization header to request
    /// </summary>
    /// <param name="httpClient">The HttpClient</param>
    /// <param name="authorizationToken">the authorization token (jwt)</param>
    /// <param name="requestUri">The request Uri</param>
    /// <param name="platformAccessToken">The platformAccess tokens</param>
    /// <param name="cancellationToken">The cancellation token</param>
    /// <returns>A HttpResponseMessage</returns>
    public static async Task<HttpResponseMessage> GetAsync(
        this HttpClient httpClient,
        string authorizationToken,
        string requestUri,
        string? platformAccessToken = null,
        CancellationToken cancellationToken = default
    )
    {
        using HttpRequestMessage request = new(HttpMethod.Get, requestUri);

        request.Headers.Authorization = new AuthenticationHeaderValue(
            Constants.AuthorizationSchemes.Bearer,
            authorizationToken
        );

        if (!string.IsNullOrEmpty(platformAccessToken))
        {
            request.Headers.Add(Constants.General.PlatformAccessTokenHeaderName, platformAccessToken);
        }

        return await httpClient.SendAsync(request, HttpCompletionOption.ResponseContentRead, cancellationToken);
    }

    /// <summary>
    /// Extension that adds authorization header to request and returns response configured for streaming.
    /// Response returns immediately after headers are received, allowing content to be streamed.
    /// </summary>
    /// <param name="httpClient">The HttpClient</param>
    /// <param name="authorizationToken">the authorization token (jwt)</param>
    /// <param name="requestUri">The request Uri</param>
    /// <param name="platformAccessToken">The platformAccess tokens</param>
    /// <param name="cancellationToken">The cancellation token</param>
    /// <returns>A HttpResponseMessage</returns>
    /// <remarks>When using GetStreamingAsync() for large file downloads, ensure your HttpClient
    /// instance has an appropriate timeout configured. The default timeout may be too short for large files.</remarks>
    public static async Task<HttpResponseMessage> GetStreamingAsync(
        this HttpClient httpClient,
        string authorizationToken,
        string requestUri,
        string? platformAccessToken = null,
        CancellationToken cancellationToken = default
    )
    {
        using HttpRequestMessage request = new(HttpMethod.Get, requestUri);

        request.Headers.Authorization = new AuthenticationHeaderValue(
            Constants.AuthorizationSchemes.Bearer,
            authorizationToken
        );

        if (!string.IsNullOrEmpty(platformAccessToken))
        {
            request.Headers.Add(Constants.General.PlatformAccessTokenHeaderName, platformAccessToken);
        }

        return await httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
    }

    /// <summary>
    /// Extension that add authorization header to request
    /// </summary>
    /// <param name="httpClient">The HttpClient</param>
    /// <param name="authorizationToken">the authorization token (jwt)</param>
    /// <param name="requestUri">The request Uri</param>
    /// <param name="platformAccessToken">The platformAccess tokens</param>
    /// <param name="cancellationToken">The cancellation token</param>
    /// <returns>A HttpResponseMessage</returns>
    public static async Task<HttpResponseMessage> DeleteAsync(
        this HttpClient httpClient,
        string authorizationToken,
        string requestUri,
        string? platformAccessToken = null,
        CancellationToken cancellationToken = default
    )
    {
        using HttpRequestMessage request = new(HttpMethod.Delete, requestUri);

        request.Headers.Authorization = new AuthenticationHeaderValue(
            Constants.AuthorizationSchemes.Bearer,
            authorizationToken
        );

        if (!string.IsNullOrEmpty(platformAccessToken))
        {
            request.Headers.Add(Constants.General.PlatformAccessTokenHeaderName, platformAccessToken);
        }

        return await httpClient.SendAsync(request, cancellationToken);
    }
}
