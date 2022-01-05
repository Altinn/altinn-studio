using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace Altinn.EFormidlingClient.Extensions
{
    /// <summary>
    /// This extension is created to make it easy to add a bearer token to a HttpRequests. 
    /// </summary>
    public static class HttpClientExtension
    {
        /// <summary>
        /// Extension that adds provided request headers to request
        /// </summary>
        /// <param name="httpClient">The HttpClient</param>
        /// <param name="requestUri">The request Uri</param>
        /// <param name="content">The http content</param>
        /// <param name="requestHeaders">Dictionary of request headers to include</param>
        /// <returns>A HttpResponseMessage</returns>
        public static Task<HttpResponseMessage> PostAsync(this HttpClient httpClient, string requestUri, HttpContent content, Dictionary<string, string> requestHeaders)
        {
            var request = new HttpRequestMessage(HttpMethod.Post, requestUri)
            {
                Content = content
            };

            SetRequestHeaders(request, requestHeaders);

            return httpClient.SendAsync(request, CancellationToken.None);
        }

        /// <summary>
        /// Extension that adds provided request headers to request
        /// </summary>
        /// <param name="httpClient">The HttpClient</param>
        /// <param name="requestUri">The request Uri</param>
        /// <param name="content">The http content</param>
        /// <param name="requestHeaders">Dictionary of request headers to include</param>
        /// <returns>A HttpResponseMessage</returns>
        public static Task<HttpResponseMessage> PutAsync(this HttpClient httpClient, string requestUri, HttpContent content, Dictionary<string, string> requestHeaders)
        {
            var request = new HttpRequestMessage(HttpMethod.Put, requestUri)
            {
                Content = content
            };

            SetRequestHeaders(request, requestHeaders);

            return httpClient.SendAsync(request, CancellationToken.None);
        }

        /// <summary>
        /// Extension that adds provided request headers to request
        /// </summary>
        /// <param name="httpClient">The HttpClient</param>
        /// <param name="requestUri">The request Uri</param>
        /// <param name="requestHeaders">Dictionary of request headers to include</param>
        /// <returns>A HttpResponseMessage</returns>
        public static Task<HttpResponseMessage> GetAsync(this HttpClient httpClient, string requestUri, Dictionary<string, string> requestHeaders)
        {
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Get, requestUri);

            SetRequestHeaders(request, requestHeaders);

            return httpClient.SendAsync(request, HttpCompletionOption.ResponseContentRead, CancellationToken.None);
        }

        /// <summary>
        /// Extension that adds provided request headers to request
        /// </summary>
        /// <param name="httpClient">The HttpClient</param>
        /// <param name="requestUri">The request Uri</param>
        /// <param name="requestHeaders">Dictionary of request headers to include</param>
        /// <returns>A HttpResponseMessage</returns>
        public static Task<HttpResponseMessage> DeleteAsync(this HttpClient httpClient, string requestUri, Dictionary<string, string> requestHeaders)
        {
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Delete, requestUri);

            SetRequestHeaders(request, requestHeaders);

            return httpClient.SendAsync(request, HttpCompletionOption.ResponseContentRead, CancellationToken.None);
        }

        private static void SetRequestHeaders(HttpRequestMessage request, Dictionary<string, string> requestHeaders)
        {
            if (requestHeaders != null)
            {
                foreach (KeyValuePair<string, string> header in requestHeaders)
                {
                    request.Headers.Add(header.Key, header.Value);
                }
            }
        }
    }
}
