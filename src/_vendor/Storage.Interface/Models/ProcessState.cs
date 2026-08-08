#nullable disable

using System;
using Altinn.Platform.Storage.Interface.Enums;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models;

/// <summary>
/// Represents a status object that holds the process state of an application instance.
/// The process is defined by the application's process specification BPMN file.
/// </summary>
[JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
public class ProcessState
{
    /// <summary>
    /// Gets or sets the Storage-controlled process status.
    /// An absent value has the same meaning as <see cref="ProcessStatus.Idle"/>.
    /// </summary>
    [JsonProperty(PropertyName = "status")]
    [System.Text.Json.Serialization.JsonIgnore(
        Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    )]
    public ProcessStatus? Status { get; set; }

    /// <summary>
    /// Gets or sets the date and time for when the process was started.
    /// </summary>
    [JsonProperty(PropertyName = "started")]
    public DateTime? Started { get; set; }

    /// <summary>
    /// Gets or sets the event that was used to start the process.
    /// </summary>
    [JsonProperty(PropertyName = "startEvent")]
    public string StartEvent { get; set; }

    /// <summary>
    /// Gets or sets a status object containing the task info of the currentTask of an ongoing process.
    /// If process is not started or ended this field will not have value.
    /// </summary>
    [JsonProperty(PropertyName = "currentTask")]
    public ProcessElementInfo CurrentTask { get; set; }

    /// <summary>
    /// Gets or sets the date and time for then the process ended/completed.
    /// </summary>
    [JsonProperty(PropertyName = "ended")]
    public DateTime? Ended { get; set; }

    /// <summary>
    /// Gets or sets the end event of the process.
    /// </summary>
    [JsonProperty(PropertyName = "endEvent")]
    public string EndEvent { get; set; }
}
