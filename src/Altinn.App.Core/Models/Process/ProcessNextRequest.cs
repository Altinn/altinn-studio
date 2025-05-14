using System.Security.Claims;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Models.Process;

/// <summary>
/// Class that defines the request for moving the process to the next task
/// </summary>
public class ProcessNextRequest
{
    /// <summary>
    /// The instance to be moved to the next task
    /// </summary>
    public required Instance Instance { get; init; }

    /// <summary>
    /// The user that is performing the action
    /// </summary>
    public required ClaimsPrincipal User { get; init; }

    /// <summary>
    /// The action that is performed
    /// </summary>
    public required string? Action { get; init; }

    /// <summary>
    /// The organisation number of the party the user is acting on behalf of
    /// </summary>
    public string? ActionOnBehalfOf { get; set; }

    /// <summary>
    /// The language the user sent with process/next (not required)
    /// </summary>
    public required string? Language { get; init; }
}
