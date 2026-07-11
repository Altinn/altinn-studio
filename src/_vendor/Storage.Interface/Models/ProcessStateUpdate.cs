#nullable disable

using System.Collections.Generic;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models;

/// <summary>
/// Process state update including events
/// </summary>
[JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
public class ProcessStateUpdate
{
    /// <summary>
    /// The state of the process
    /// </summary>
    [JsonProperty(PropertyName = "state")]
    public ProcessState State { get; set; }

    /// <summary>
    /// The instance events produced during process/next
    /// </summary>
    [JsonProperty(PropertyName = "events")]
    public List<InstanceEvent> Events { get; set; }
}
