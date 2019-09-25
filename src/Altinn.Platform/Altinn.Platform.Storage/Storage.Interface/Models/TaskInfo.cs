using Newtonsoft.Json;
using System;

namespace Storage.Interface.Models
{
    /// <summary>
    /// Contains information about the current task of a process
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class TaskInfo
    {
        /// <summary>
        /// The sequence number of the various tasks and events that have been reached by this process.
        /// </summary>
        [JsonProperty(PropertyName = "sequenceNumber")]
        public int SequenceNumber { get; set; }

        /// <summary>
        /// Date and time when the task is started.
        /// </summary>
        [JsonProperty(PropertyName = "started")]
        public DateTime? Started { get; set; }

        /// <summary>
        /// Reference to the current Task/event in the process definition.
        /// </summary>
        [JsonProperty(PropertyName = "processElementId")]
        public string ProcessElementId { get; set; }

        /// <summary>
        /// An altinn specific task type which specifies the wanted behaviour of the task.
        /// </summary>
        [JsonProperty(PropertyName = "altinnTaskType")]
        public string AltinnTaskType { get; set; }

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
