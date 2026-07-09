#nullable disable

using System;
using System.Net;

namespace Altinn.Platform.Storage.Repository;

/// <summary>
/// Exception thrown by the repository layer
/// </summary>
public class RepositoryException : Exception
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

/// <summary>
/// Exception thrown when a data element blob version precondition does not match.
/// </summary>
public class DataElementBlobVersionMismatchException : RepositoryException
{
    /// <summary>
    /// Create DataElementBlobVersionMismatchException with message and conflict status.
    /// </summary>
    /// <param name="message">Exception message</param>
    public DataElementBlobVersionMismatchException(string message)
        : base(message, HttpStatusCode.Conflict) { }
}

/// <summary>
/// Exception thrown when a supplied storage-owned version precondition does not match.
/// </summary>
public abstract class StorageVersionMismatchException : RepositoryException
{
    /// <summary>
    /// Create a storage version mismatch exception.
    /// </summary>
    protected StorageVersionMismatchException(
        string message,
        int currentInstanceVersion,
        int currentProcessStateVersion
    )
        : base(message, HttpStatusCode.PreconditionFailed)
    {
        CurrentInstanceVersion = currentInstanceVersion;
        CurrentProcessStateVersion = currentProcessStateVersion;
    }

    /// <summary>
    /// Current aggregate instance version.
    /// </summary>
    public int CurrentInstanceVersion { get; }

    /// <summary>
    /// Current process-state version.
    /// </summary>
    public int CurrentProcessStateVersion { get; }
}

/// <summary>
/// Exception thrown when If-Instance-Version-Match does not match.
/// </summary>
public sealed class InstanceVersionMismatchException : StorageVersionMismatchException
{
    /// <summary>
    /// Create an instance-version mismatch exception.
    /// </summary>
    public InstanceVersionMismatchException(
        int currentInstanceVersion,
        int currentProcessStateVersion
    )
        : base(
            "Instance version did not match expected version.",
            currentInstanceVersion,
            currentProcessStateVersion
        ) { }
}

/// <summary>
/// Exception thrown when If-Process-State-Version-Match does not match.
/// </summary>
public sealed class ProcessStateVersionMismatchException : StorageVersionMismatchException
{
    /// <summary>
    /// Create a process-state-version mismatch exception.
    /// </summary>
    public ProcessStateVersionMismatchException(
        int currentInstanceVersion,
        int currentProcessStateVersion
    )
        : base(
            "Process state version did not match expected version.",
            currentInstanceVersion,
            currentProcessStateVersion
        ) { }
}
