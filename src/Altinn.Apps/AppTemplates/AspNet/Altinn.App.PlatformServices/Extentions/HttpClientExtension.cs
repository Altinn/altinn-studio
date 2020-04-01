using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace Altinn.App.PlatformServices.Extentions
{
    public static class HttpClientExtension
    {
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
        /// <param name="httpClient"></param>
        /// <param name="authorizationToken"></param>
        /// <param name="requestUri"></param>
        /// <param name="content"></param>
        /// <returns></returns>
        public static Task<HttpResponseMessage> PutAsync(this HttpClient httpClient, string authorizationToken, string requestUri, HttpContent content)
        {
                HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Put, requestUri);
                request.Headers.Add("Authorization", "Bearer " + authorizationToken);
                request.Content = content;
                return httpClient.SendAsync(request, CancellationToken.None);
        }

        public static Task<HttpResponseMessage> GetAsync(this HttpClient httpClient, string authorizationToken, string requestUri)
        {
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Get, requestUri);
            request.Headers.Add("Authorization", "Bearer " + authorizationToken);
            return httpClient.SendAsync(request, HttpCompletionOption.ResponseContentRead, CancellationToken.None);
        }

        public static Task<HttpResponseMessage> DeleteAsync(this HttpClient httpClient, string authorizationToken, string requestUri)
        {
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Delete, requestUri);
            request.Headers.Add("Authorization", "Bearer " + authorizationToken);
            return httpClient.SendAsync(request, CancellationToken.None);
        }
    }
}
