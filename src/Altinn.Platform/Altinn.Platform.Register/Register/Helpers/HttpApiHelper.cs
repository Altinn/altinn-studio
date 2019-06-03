using System.Net.Http;

namespace Altinn.Platform.Register.Helpers
{
    /// <summary>
    /// Implementation for Http api helper
    /// </summary>
    public static class HttpApiHelper
    {
        /// <summary>
        /// Method that build up the api client to be used to communicate with the sbl bridge
        /// </summary>
        /// <param name="allowAutoRedirect">flag that sets allow auto redirect to true or false</param>
        /// <returns></returns>
        public static HttpClient GetApiClient(bool allowAutoRedirect = true)
        {
            HttpClientHandler httpClientHandler = new HttpClientHandler();
            httpClientHandler.AllowAutoRedirect = allowAutoRedirect;

            HttpClient client = new HttpClient(httpClientHandler);

            // TODO: add token to authorize request?
            return client;
        }
    }
}
