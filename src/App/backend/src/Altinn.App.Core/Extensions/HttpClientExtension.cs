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
    /// <returns>A HttpResponseMessage</returns>
    public static async Task<HttpResponseMessage> PostAsync(
        this HttpClient httpClient,
        string authorizationToken,
        string requestUri,
        HttpContent? content,
        string? platformAccessToken = null
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

        return await httpClient.SendAsync(request, CancellationToken.None);
    }

    /// <summary>
    /// Extension that add authorization header to request
    /// </summary>
    /// <param name="httpClient">The HttpClient</param>
    /// <param name="authorizationToken">the authorization token (jwt)</param>
    /// <param name="requestUri">The request Uri</param>
    /// <param name="content">The http content</param>
    /// <param name="platformAccessToken">The platformAccess tokens</param>
    /// <returns>A HttpResponseMessage</returns>
    public static async Task<HttpResponseMessage> PutAsync(
        this HttpClient httpClient,
        string authorizationToken,
        string requestUri,
        HttpContent? content,
        string? platformAccessToken = null
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

        return await httpClient.SendAsync(request, CancellationToken.None);
    }

    /// <summary>
    /// Extension that add authorization header to request
    /// </summary>
    /// <param name="httpClient">The HttpClient</param>
    /// <param name="authorizationToken">the authorization token (jwt)</param>
    /// <param name="requestUri">The request Uri</param>
    /// <param name="platformAccessToken">The platformAccess tokens</param>
    /// <returns>A HttpResponseMessage</returns>
    public static async Task<HttpResponseMessage> GetAsync(
        this HttpClient httpClient,
        string authorizationToken,
        string requestUri,
        string? platformAccessToken = null
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

        return await httpClient.SendAsync(request, HttpCompletionOption.ResponseContentRead, CancellationToken.None);
    }

    /// <summary>
    /// Extension that add authorization header to request
    /// </summary>
    /// <param name="httpClient">The HttpClient</param>
    /// <param name="authorizationToken">the authorization token (jwt)</param>
    /// <param name="requestUri">The request Uri</param>
    /// <param name="platformAccessToken">The platformAccess tokens</param>
    /// <returns>A HttpResponseMessage</returns>
    public static async Task<HttpResponseMessage> DeleteAsync(
        this HttpClient httpClient,
        string authorizationToken,
        string requestUri,
        string? platformAccessToken = null
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

        return await httpClient.SendAsync(request, CancellationToken.None);
    }
}
