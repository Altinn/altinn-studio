using System.Net;

namespace Altinn.Studio.AppDist;

/// <summary>
/// Base class for errors reported by the app distribution client.
/// </summary>
public abstract class AppDistException : Exception
{
    protected AppDistException(string message)
        : base(message) { }

    protected AppDistException(string message, Exception innerException)
        : base(message, innerException) { }
}

/// <summary>
/// The configured source could not complete an app distribution operation.
/// </summary>
public class AppDistSourceException : AppDistException
{
    public AppDistSourceException(string message)
        : base(message) { }

    public AppDistSourceException(string message, Exception innerException)
        : base(message, innerException) { }

    public AppDistSourceException(string message, HttpStatusCode statusCode)
        : base(message) => StatusCode = statusCode;

    public AppDistSourceException(string message, HttpStatusCode statusCode, Exception innerException)
        : base(message, innerException) => StatusCode = statusCode;

    /// <summary>
    /// Gets the HTTP status returned by the source, when the failure originated from an HTTP response.
    /// </summary>
    public HttpStatusCode? StatusCode { get; }
}

/// <summary>
/// The configured source is temporarily unavailable.
/// </summary>
public sealed class AppDistSourceUnavailableException : AppDistSourceException
{
    public AppDistSourceUnavailableException(string message)
        : base(message) { }

    public AppDistSourceUnavailableException(string message, Exception innerException)
        : base(message, innerException) { }

    public AppDistSourceUnavailableException(string message, HttpStatusCode statusCode)
        : base(message, statusCode) { }

    public AppDistSourceUnavailableException(string message, HttpStatusCode statusCode, Exception innerException)
        : base(message, statusCode, innerException) { }
}

/// <summary>
/// The configured source rejected the request because it could not be authenticated or authorized.
/// </summary>
public sealed class AppDistSourceAccessDeniedException : AppDistSourceException
{
    public AppDistSourceAccessDeniedException(string message, HttpStatusCode statusCode)
        : base(message, statusCode) { }

    public AppDistSourceAccessDeniedException(string message, HttpStatusCode statusCode, Exception innerException)
        : base(message, statusCode, innerException) { }
}

/// <summary>
/// A published app distribution artifact is malformed, incomplete, or failed integrity validation.
/// </summary>
public sealed class AppDistArtifactException : AppDistException
{
    public AppDistArtifactException(string message)
        : base(message) { }

    public AppDistArtifactException(string message, Exception innerException)
        : base(message, innerException) { }
}
