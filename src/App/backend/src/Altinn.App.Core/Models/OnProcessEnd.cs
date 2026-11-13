using Newtonsoft.Json;

namespace Altinn.App.Core.Models;

/// <summary>
/// What the app does when the process reaches its end event.
/// </summary>
public class OnProcessEnd
{
    /// <summary>
    /// Confirms the instance as complete for the service owner. The app owner's policy must grant the
    /// <c>complete</c> action, which Storage checks against the end event.
    /// </summary>
    [JsonProperty(PropertyName = "confirm")]
    public bool Confirm { get; set; }
}
