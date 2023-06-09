using System;
using System.Net;

namespace Altinn.Platform.Storage.Repository;

/// <summary>
/// Exception thrown by the repository layer
/// </summary>
public class RepositoryException: Exception
{
    /// <summary>
    /// Suggested status code to return to the client
    /// </summary>
    public virtual HttpStatusCode? StatusCodeSuggestion { get; }

    /// <summary>
    /// Create RepositoryException with message and optional suggested status code
    /// </summary>
    /// <param name="message">Exception message</param>
    /// <param name="statusCodeSuggestion">Optional suggested <see cref="HttpStatusCode"/> to return to the client</param>
    public RepositoryException(string message, HttpStatusCode? statusCodeSuggestion = null) : base(message)
    {
        StatusCodeSuggestion = statusCodeSuggestion;
    }

    /// <summary>
    /// Create RepositoryException with message, inner exception and optional suggested status code
    /// </summary>
    /// <param name="message">Exception message</param>
    /// <param name="innerException">Inner exception</param>
    /// <param name="statusCodeSuggestion">Optional suggested <see cref="HttpStatusCode"/> to return to the client</param>
    public RepositoryException(string message, Exception innerException, HttpStatusCode? statusCodeSuggestion = null) : base(message, innerException)
    {
        StatusCodeSuggestion = statusCodeSuggestion;
    }
}
