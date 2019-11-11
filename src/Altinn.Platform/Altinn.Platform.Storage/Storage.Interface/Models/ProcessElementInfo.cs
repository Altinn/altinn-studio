using Newtonsoft.Json;
using System;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Contains information about the current task/event element of a process
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class ProcessElementInfo
    {
        /// <summary>
        /// The sequence number of the various tasks and event elements that have been reached by this process.
        /// </summary>
        [JsonProperty(PropertyName = "flow")]
        public int? Flow { get; set; }

        /// <summary>
        /// Date and time when the task was started.
        /// </summary>
        [JsonProperty(PropertyName = "started")]
        public DateTime? Started { get; set; }

        /// <summary>
        /// Reference to the current task/event element id as given in the process definition.
        /// </summary>
        [JsonProperty(PropertyName = "elementId")]
        public string ElementId { get; set; }

        /// <summary>
        /// The name of the process element
        /// </summary>
        [JsonProperty(PropertyName = "name")]
        public string Name { get; set; }

        /// <summary>
        /// An altinn specific task type which specifies the wanted behaviour of the task.
        /// </summary>
        [JsonProperty(PropertyName = "altinnTaskType")]
        public string AltinnTaskType { get; set; }

        /// <summary>
        /// Date and time when the task was ended (closed/completed)
        /// </summary>
        [JsonProperty(PropertyName = "ended")]
        public DateTime? Ended { get; set; }

        /// <summary>
        /// Validation status.
        /// </summary>
        [JsonProperty(PropertyName = "validated")]
        public ValidationStatus Validated { get; set; } 
    }

    /// <summary>
    /// Validation status section.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class ValidationStatus
    {
        /// <summary>
        /// The date and time of the last validation of task.
        /// </summary>
        [JsonProperty(PropertyName = "timestamp")]
        public DateTime? Timestamp { get; set; }

        /// <summary>
        /// Indicates if the validation was successfull and that the task can be completed.
        /// </summary>
        [JsonProperty(PropertyName = "canCompleteTask")]
        public bool CanCompleteTask { get; set; }
    }
}
