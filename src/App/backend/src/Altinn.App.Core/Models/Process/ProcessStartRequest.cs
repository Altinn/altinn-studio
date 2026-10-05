using System.Security.Claims;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Models.Process;

/// <summary>
/// Class that defines the request for starting a new process
/// </summary>
public class ProcessStartRequest
{
#nullable disable
    /// <summary>
    /// The instance to be started
    /// </summary>
    public Instance Instance { get; set; }

    /// <summary>
    /// The user that is starting the process
    /// </summary>
    public ClaimsPrincipal User { get; set; }

#nullable restore

    /// <summary>
    /// The prefill data supplied when starting the process
    /// </summary>
    public Dictionary<string, string>? Prefill { get; set; }

    /// <summary>
    /// The start event id, only needed if multiple start events in process
    /// </summary>
    public string? StartEventId { get; set; }

    /// <summary>
    /// The language the user has chosen in the app, if any. Expressions evaluated while the process starts, such as
    /// the conditions of a gateway right after the start event, use it; without one, the caller's profile language
    /// is used (nb for anyone but a user).
    /// </summary>
    public string? Language { get; set; }
}
