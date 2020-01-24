using System;

namespace Altinn.Studio.Designer.TypedHttpClients.Exceptions
{
    /// <summary>
    /// Altinn specific exception which can be caught specifically when a response returns HttpStatusCode.NotFound (404)
    /// </summary>
    public class NotFoundHttpRequestException : Exception
    {
        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="message">A custom message for this specific exception</param>
        public NotFoundHttpRequestException(string message)
            : base(message)
        {
        }
    }
}
