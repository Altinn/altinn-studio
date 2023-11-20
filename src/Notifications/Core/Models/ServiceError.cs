#nullable enable
namespace Altinn.Notifications.Core.Models;

/// <summary>
/// A class representing a service error object used to transfere error information from service to controller.
/// </summary>
public class ServiceError
{
    /// <summary>
    /// The error code
    /// </summary>
    /// <remarks>An error code translates directly into an HTTP status code</remarks>
    public int ErrorCode { get; private set; }

    /// <summary>
    /// The error message
    /// </summary>
    public string? ErrorMessage { get; private set; }

    /// <summary>
    /// Create a new instance of a service error
    /// </summary>
    public ServiceError(int errorCode, string errorMessage)
    {
        ErrorCode = errorCode;
        ErrorMessage = errorMessage;
    }

    /// <summary>
    /// Create a new instance of a service error
    /// </summary>
    public ServiceError(int errorCode)
    {
        ErrorCode = errorCode;
    }
}
