using System;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Platform.Events.Functions.Extensions
{
    /// <summary>
    /// This extension is created to make it easy to add a bearer token to a HttpRequests. 
    /// </summary>
    public static class HttpClientExtension
    {
        /// <summary>
        /// Extension that add authorization header to request
        /// </summary>
        /// <param name="httpClient">The HttpClient</param>
        /// <param name="requestUri">The request Uri</param>
        /// <param name="content">The http content</param>
        /// <param name="platformAccessToken">The platformAccess tokens</param>
        /// <returns>A HttpResponseMessage</returns>
        public static Task<HttpResponseMessage> PostAsync(this HttpClient httpClient, string requestUri, HttpContent content, string platformAccessToken = null)
        {
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, new Uri(requestUri, UriKind.Relative));
            request.Content = content;

            if (!string.IsNullOrEmpty(platformAccessToken))
            {
                request.Headers.Add("PlatformAccessToken", platformAccessToken);
            }

            return httpClient.SendAsync(request, CancellationToken.None);
        }

        /// <summary>
        /// Extension that adds authorization header to request
        /// </summary>
        /// <param name="httpClient">The HttpClient</param>
        /// <param name="requestUri">The request Uri</param>
        /// <param name="content">The http content</param>
        /// <param name="platformAccessToken">The platformAccess tokens</param>
        /// <returns>A HttpResponseMessage</returns>
        public static Task<HttpResponseMessage> PutAsync(this HttpClient httpClient, string requestUri, HttpContent content, string platformAccessToken = null)
        {
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Put, requestUri);
            request.Content = content;
            if (!string.IsNullOrEmpty(platformAccessToken))
            {
                request.Headers.Add("PlatformAccessToken", platformAccessToken);
            }

            return httpClient.SendAsync(request, CancellationToken.None);
        }
    }
}
