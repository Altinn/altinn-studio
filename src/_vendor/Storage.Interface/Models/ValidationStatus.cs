#nullable disable

using System;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models;

/// <summary>
/// Represents the validation status of a data element.
/// </summary>
[JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
[Obsolete(
    "ValidationStatus is no longer used by apps. Validation is performed on process changes instead"
)]
public class ValidationStatus
{
    /// <summary>
    /// Gets or sets the date and time of the last validation of task.
    /// </summary>
    [JsonProperty(PropertyName = "timestamp")]
    public DateTime? Timestamp { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the validation was successful and that the task can be completed.
    /// </summary>
    [JsonProperty(PropertyName = "canCompleteTask")]
    public bool CanCompleteTask { get; set; }
}
