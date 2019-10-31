using Newtonsoft.Json;
using System;

namespace Storage.Interface.Models
{
    /// <summary>
    /// Holds the process state of an application instance.
    /// The process is defined by the application's process specification BPMN file. 
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class ProcessState
    {
        /// <summary>
        /// Indicates the date and time when the process was initialized
        /// </summary>
        [JsonProperty(PropertyName = "started")]
        public DateTime? Started { get; set; }

        /// <summary>
        /// The start event that was used to start the process. 
        /// </summary>
        [JsonProperty(PropertyName = "startEvent")]
        public string StartEvent { get; set; }

        /// <summary>
        /// Contains the task info of the currentTask of an ongoing process.
        /// If process is not started or ended this field will not have value. 
        /// </summary>
        [JsonProperty(PropertyName = "currentTask")]
        public ProcessElementInfo CurrentTask { get; set; }

        /// <summary>
        /// The date time the process was ended/completed. 
        /// </summary>
        [JsonProperty(PropertyName = "ended")]
        public DateTime? Ended { get; set; }

        /// <summary>
        /// The end event of the process. 
        /// </summary>
        [JsonProperty(PropertyName = "endEvent")]
        public string EndEvent { get; set; }
    }
}
