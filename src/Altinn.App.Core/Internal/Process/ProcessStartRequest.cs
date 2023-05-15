using System.Security.Claims;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Class that defines the request for starting a new process
/// </summary>
public class ProcessStartRequest
{
    /// <summary>
    /// The instance to be started
    /// </summary>
    public Instance Instance { get; set; }
    /// <summary>
    /// The user that is starting the process
    /// </summary>
    public ClaimsPrincipal User { get; set; }
    /// <summary>
    /// The prefill data supplied when starting the process
    /// </summary>
    public Dictionary<string, string>? Prefill { get; set; }
    /// <summary>
    /// The start event id, only needed if multiple start events in process
    /// </summary>
    public string? StartEventId { get; set; }
    /// <summary>
    /// If set to true the instance is not updated and the events are not dispatched
    /// </summary>
    public bool Dryrun { get; set; }
}