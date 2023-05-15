using System.Security.Claims;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Class that defines the request for moving the process to the next task
/// </summary>
public class ProcessNextRequest
{
    /// <summary>
    /// The instance to be moved to the next task
    /// </summary>
    public Instance Instance { get; set; }
    /// <summary>
    /// The user that is performing the action
    /// </summary>
    public ClaimsPrincipal User { get; set; }
    /// <summary>
    /// The action that is performed
    /// </summary>
    public string? Action { get; set; }
}
