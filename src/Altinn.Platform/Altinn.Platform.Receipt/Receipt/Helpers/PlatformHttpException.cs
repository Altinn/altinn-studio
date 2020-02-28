using System;
using System.Net.Http;
using System.Runtime.Serialization;

namespace Altinn.Platform.Receipt.Helpers
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
        /// Copy the response for further investigations
        /// </summary>
        /// <param name="response">the response</param>
        public PlatformHttpException(HttpResponseMessage response) : base(ModifyMessage(response))
        {
            this.Response = response;
        }

        private static string ModifyMessage(HttpResponseMessage response)
        {
            string content = response.Content?.ReadAsStringAsync().Result;
            string message = $"{(int)response.StatusCode} - {response.ReasonPhrase} - {content}";

            return message;
        }

        /// <summary>
        /// Add serialization info.
        /// </summary>
        protected PlatformHttpException(SerializationInfo info, StreamingContext context) : base(info, context)
        {
        }
    }
}
