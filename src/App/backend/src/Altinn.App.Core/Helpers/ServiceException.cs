using System.Net;
using Altinn.App.Core.Exceptions;

namespace Altinn.App.Core.Helpers;

/// <summary>
/// Exception that is thrown by service implementation.
/// </summary>
public class ServiceException : AltinnException
{
    /// <summary>
    /// The proposed return http status code.
    /// </summary>
    public HttpStatusCode StatusCode { get; }

    /// <summary>
    /// Add a proposed http status return code and message.
    /// </summary>
    /// <param name="statusCode">the suggested return code</param>
    /// <param name="message">the message</param>
    public ServiceException(HttpStatusCode statusCode, string message)
        : base(message)
    {
        StatusCode = statusCode;
    }

    /// <summary>
    /// Add inner exception.
    /// </summary>
    /// <param name="statusCode">the suggested return code</param>
    /// <param name="message">the message</param>
    /// <param name="innerException">the inner exception</param>
    public ServiceException(HttpStatusCode statusCode, string message, Exception innerException)
        : base(message, innerException)
    {
        StatusCode = statusCode;
    }
}
