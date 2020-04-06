using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Platform.Receipt.Extensions
{
    /// <summary>
    /// Extension to support token
    /// </summary>
    public static class HttpClientExtension
    {
        /// <summary>
        /// Extension for Post
        /// </summary>
        /// <param name="httpClient">Http client</param>
        /// <param name="authorizationToken">the token</param>
        /// <param name="requestUri">the request</param>
        /// <param name="content">the content</param>
        /// <returns></returns>
        public static Task<HttpResponseMessage> PostAsync(this HttpClient httpClient, string authorizationToken, string requestUri, HttpContent content)
        {
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, requestUri);
            request.Headers.Add("Authorization", "Bearer " + authorizationToken);
            request.Content = content;
            return httpClient.SendAsync(request, CancellationToken.None);
        }

        /// <summary>
        /// Extension that add authorization header to request
        /// </summary>
        /// <param name="httpClient">Http client</param>
        /// <param name="authorizationToken">the token</param>
        /// <param name="requestUri">the request</param>
        /// <param name="content">the content</param>
        /// <returns></returns>
        public static Task<HttpResponseMessage> PutAsync(this HttpClient httpClient, string authorizationToken, string requestUri, HttpContent content)
        {
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Put, requestUri);
            request.Headers.Add("Authorization", "Bearer " + authorizationToken);
            request.Content = content;
            return httpClient.SendAsync(request, CancellationToken.None);
        }

        /// <summary>
        /// Extension for GetAsync
        /// </summary>
        /// <param name="httpClient">Http client</param>
        /// <param name="authorizationToken">the token</param>
        /// <param name="requestUri">the request</param>
        /// <returns></returns>
        public static Task<HttpResponseMessage> GetAsync(this HttpClient httpClient, string authorizationToken, string requestUri)
        {
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Get, requestUri);
            request.Headers.Add("Authorization", "Bearer " + authorizationToken);
            return httpClient.SendAsync(request, HttpCompletionOption.ResponseContentRead, CancellationToken.None);
        }

        /// <summary>
        /// Extension for deleteASync
        /// </summary>
        /// <param name="httpClient">Http client</param>
        /// <param name="authorizationToken">the token</param>
        /// <param name="requestUri">the request</param>
        /// <returns></returns>
        public static Task<HttpResponseMessage> DeleteAsync(this HttpClient httpClient, string authorizationToken, string requestUri)
        {
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Delete, requestUri);
            request.Headers.Add("Authorization", "Bearer " + authorizationToken);
            return httpClient.SendAsync(request, CancellationToken.None);
        }
    }
}
