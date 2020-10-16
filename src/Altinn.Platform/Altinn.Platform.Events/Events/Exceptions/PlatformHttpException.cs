using System;
using System.Net.Http;
using System.Runtime.Serialization;
using System.Threading.Tasks;

namespace Altinn.Platform.Events.Exceptions
{
    /// <summary>
    /// Exception class to hold exceptions when talking to the platform REST services
    /// </summary>
    [Serializable]
    public class PlatformHttpException : Exception
    {
        /// <summary>
        /// Responsible for holding an http request exception towards platform.
        /// </summary>
        public HttpResponseMessage Response { get; }

        /// <summary>
        /// Creates a platform exception
        /// </summary>
        /// <param name="response">The http response</param>
        /// <returns>A PlatformHttpException</returns>
        public static async Task<PlatformHttpException> CreateAsync(HttpResponseMessage response)
        {
            string content = await response.Content.ReadAsStringAsync();
            string message = $"{(int)response.StatusCode} - {response.ReasonPhrase} - {content}";

            return new PlatformHttpException(response, message);
        }

        /// <summary>
        /// Copy the response for further investigations
        /// </summary>
        /// <param name="response">the response</param>
        /// <param name="message">the message</param>
        public PlatformHttpException(HttpResponseMessage response, string message) : base(message)
        {
            this.Response = response;
        }

        /// <summary>
        /// Add serialization info.
        /// </summary>
        protected PlatformHttpException(SerializationInfo info, StreamingContext context) : base(info, context)
        {
        }
    }
}
