namespace WorkflowEngine.Models;

/// <summary>
/// The status of a request to the process engine.
/// </summary>
public enum RequestStatus
{
    /// <summary>
    /// The request has been accepted.
    /// </summary>
    Accepted,

    /// <summary>
    /// The request has been rejected.
    /// </summary>
    Rejected,
}
