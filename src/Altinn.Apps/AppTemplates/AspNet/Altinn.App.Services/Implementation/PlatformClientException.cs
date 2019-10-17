using System;
using System.Net.Http;
using System.Runtime.Serialization;

namespace Altinn.App.Services.Implementation
{
    /// <summary>
    /// Exception class to hold exceptions when talking to the platform REST services
    /// </summary>
    [Serializable]
    public class PlatformClientException : Exception
    {
        /// <summary>
        /// the response message which is not a success.
        /// </summary>
        public HttpResponseMessage Response { get; }

        /// <summary>
        /// Copy the response for further investigations
        /// </summary>
        /// <param name="response">the response</param>
        public PlatformClientException(HttpResponseMessage response) : base(ModifyMessage(response))
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
        /// Just a single line
        /// </summary>
        /// <param name="message">the message</param>
        public PlatformClientException(string message) : base(message)
        {
        }

        /// <summary>
        /// Inner exception
        /// </summary>
        public PlatformClientException(string message, Exception innerException) : base(message, innerException)
        {
        }

        /// <summary>
        /// C# stuff to what knows why
        /// </summary>
        protected PlatformClientException(SerializationInfo info, StreamingContext context) : base(info, context)
        {
        }
    }
}
