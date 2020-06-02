using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace Altinn.App.PlatformServices.Extentions
{
    /// <summary>
    /// This extentsion is created to make it easy to add a bearer token to a httprequests. 
    /// </summary>
    public static class HttpClientExtension
    {

        /// <summary>
        /// Extension that add authorization header to request
        /// </summary>
        /// <param name="httpClient">The httpclient</param>
        /// <param name="authorizationToken">the authorization token (jwt)</param>
        /// <param name="requestUri">The request Uri</param>
        /// <param name="content">The http content</param>
        /// <param name="platformAccessToken">The platformAccess tokens</param>
        /// <returns>A HttpResponseMessage</returns>
        public static Task<HttpResponseMessage> PostAsync(this HttpClient httpClient, string authorizationToken, string requestUri, HttpContent content, string platformAccessToken = null)
        {
                HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, requestUri);
                request.Headers.Add("Authorization", "Bearer " + authorizationToken);
                request.Content = content;
                if (!string.IsNullOrEmpty(platformAccessToken))
                {
                    request.Headers.Add("PlatformAccessToken", platformAccessToken);
                }

                return httpClient.SendAsync(request, CancellationToken.None);
        }

        /// <summary>
        /// Extension that add authorization header to request
        /// </summary>
        /// <param name="httpClient">The httpclient</param>
        /// <param name="authorizationToken">the authorization token (jwt)</param>
        /// <param name="requestUri">The request Uri</param>
        /// <param name="content">The http content</param>
        /// <param name="platformAccessToken">The platformAccess tokens</param>
        /// <returns>A HttpResponseMessage</returns>
        public static Task<HttpResponseMessage> PutAsync(this HttpClient httpClient, string authorizationToken, string requestUri, HttpContent content, string platformAccessToken = null)
        {
                HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Put, requestUri);
                request.Headers.Add("Authorization", "Bearer " + authorizationToken);
                request.Content = content;
                if (!string.IsNullOrEmpty(platformAccessToken))
                {
                    request.Headers.Add("PlatformAccessToken", platformAccessToken);
                }

                return httpClient.SendAsync(request, CancellationToken.None);
        }


        /// <summary>
        /// Extension that add authorization header to request
        /// </summary>
        /// <param name="httpClient">The httpclient</param>
        /// <param name="authorizationToken">the authorization token (jwt)</param>
        /// <param name="requestUri">The request Uri</param>
        /// <param name="platformAccessToken">The platformAccess tokens</param>
        /// <returns>A HttpResponseMessage</returns>
        public static Task<HttpResponseMessage> GetAsync(this HttpClient httpClient, string authorizationToken, string requestUri, string platformAccessToken = null)
        {
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Get, requestUri);
            request.Headers.Add("Authorization", "Bearer " + authorizationToken);
            if(!string.IsNullOrEmpty(platformAccessToken))
            {
                request.Headers.Add("PlatformAccessToken", platformAccessToken);
            }

            return httpClient.SendAsync(request, HttpCompletionOption.ResponseContentRead, CancellationToken.None);
        }


        /// <summary>
        /// Extension that add authorization header to request
        /// </summary>
        /// <param name="httpClient">The httpclient</param>
        /// <param name="authorizationToken">the authorization token (jwt)</param>
        /// <param name="requestUri">The request Uri</param>
        /// <param name="platformAccessToken">The platformAccess tokens</param>
        /// <returns>A HttpResponseMessage</returns>
        public static Task<HttpResponseMessage> DeleteAsync(this HttpClient httpClient, string authorizationToken, string requestUri, string platformAccessToken = null)
        {
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Delete, requestUri);
            request.Headers.Add("Authorization", "Bearer " + authorizationToken);
            if (!string.IsNullOrEmpty(platformAccessToken))
            {
                request.Headers.Add("PlatformAccessToken", platformAccessToken);
            }

            return httpClient.SendAsync(request, CancellationToken.None);
        }
    }
}
