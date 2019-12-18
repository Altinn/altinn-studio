using System;
using System.Net;
using System.Runtime.Serialization;

namespace Altinn.App.PlatformServices.Helpers
{
    /// <summary>
    /// Exception that is thrown by service implementation. 
    /// </summary>
    public class ServiceException : Exception
    {
        public HttpStatusCode StatusCode { get;  }
        /// <summary>
        /// Just a single line
        /// </summary>
        /// <param name="statusCode">the suggested return code</param>
        /// <param name="message">the message</param>
        public ServiceException(HttpStatusCode statusCode, string message) : base(message)
        {
            StatusCode = statusCode;
        }

        /// <summary>
        /// Add inner exception.
        /// </summary>
        /// <param name="statusCode">the suggested return code</param>
        /// <param name="message">the message</param>
        /// <param name="innerException">the inner exception</param>
        public ServiceException(HttpStatusCode statusCode, string message, Exception innerException) : base(message, innerException)
        {
            StatusCode = statusCode;
        }

        /// <summary>
        /// C# stuff to what knows why
        /// </summary>
        protected ServiceException(SerializationInfo info, StreamingContext context) : base(info, context)
        {
        }
    }
}
