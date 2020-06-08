using System;
using System.Net.Http;
using System.Runtime.Serialization;

namespace Altinn.Platform.Authentication.Services
{
    /// <summary>
    /// Represents errors that can occur during http communication with SBL Bridge.
    /// </summary>
    [Serializable]
    public class SblBridgeResponseException : Exception
    {
        /// <summary>
        /// Gets the original <see cref="HttpResponseMessage"/> received from SBL Bridge.
        /// </summary>
        public HttpResponseMessage Response { get; }

        /// <summary>
        /// Initialize a new instance of the <see cref="SblBridgeResponseException"/> class.
        /// </summary>
        protected SblBridgeResponseException()
        {
        }
        
        /// <summary>
        /// Initialize a new instance of the <see cref="SblBridgeResponseException"/> class with the given message.
        /// </summary>
        public SblBridgeResponseException(HttpResponseMessage response)
            : base(response.ReasonPhrase)
        {
            Response = response;
        }
        
        /// <summary>
        /// Initialize a new instance of the <see cref="SblBridgeResponseException"/> class with the given message.
        /// </summary>
        public SblBridgeResponseException(HttpResponseMessage response, string message)
            : base(message)
        {
            Response = response;
        }
        
        /// <summary>
        /// Initialize a new instance of the <see cref="SblBridgeResponseException"/> class.
        /// </summary>
        public SblBridgeResponseException(HttpResponseMessage response, string message, Exception innerException)
            : base(message, innerException)
        {
            Response = response;
        }
        
        /// <summary>
        /// Initialize a new instance of the <see cref="SblBridgeResponseException"/> class.
        /// </summary>
        protected SblBridgeResponseException(SerializationInfo info, StreamingContext context)
            : base(info, context)
        {
        }
    }
}
