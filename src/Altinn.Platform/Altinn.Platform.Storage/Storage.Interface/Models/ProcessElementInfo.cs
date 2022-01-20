using System;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Represents a set of properties with information about the current task/event element in a process
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class ProcessElementInfo
    {
        /// <summary>
        /// Gets or sets the sequence number of the various tasks and event elements that have been reached by this process.
        /// </summary>
        [JsonProperty(PropertyName = "flow")]
        public int? Flow { get; set; }

        /// <summary>
        /// Gets or sets the date and time for when the current task was started.
        /// </summary>
        [JsonProperty(PropertyName = "started")]
        public DateTime? Started { get; set; }

        /// <summary>
        /// Gets or sets a reference to the current task/event element id as given in the process definition.
        /// </summary>
        [JsonProperty(PropertyName = "elementId")]
        public string ElementId { get; set; }

        /// <summary>
        /// Gets or sets the name of the process element
        /// </summary>
        [JsonProperty(PropertyName = "name")]
        public string Name { get; set; }

        /// <summary>
        /// Gets or sets an altinn specific task type which specifies the wanted behaviour of the task.
        /// </summary>
        [JsonProperty(PropertyName = "altinnTaskType")]
        public string AltinnTaskType { get; set; }

        /// <summary>
        /// Gets or sets  the date and time when the task was ended (closed/completed)
        /// </summary>
        [JsonProperty(PropertyName = "ended")]
        public DateTime? Ended { get; set; }

        /// <summary>
        /// Gets or sets the validation status.
        /// </summary>
        [JsonProperty(PropertyName = "validated")]
        public ValidationStatus Validated { get; set; }

        /// <summary>
        /// Gets or sets the last flowtype.
        /// </summary>
        [JsonProperty(PropertyName = "flowType")]
        public string FlowType { get; set; }
    }
}
