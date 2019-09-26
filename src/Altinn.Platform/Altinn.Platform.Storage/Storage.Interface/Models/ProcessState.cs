using Newtonsoft.Json;
using System;

namespace Storage.Interface.Models
{
    /// <summary>
    /// Holds the process state of an application instance. The process is defined by the application's process specification BPMN file. 
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
        /// Contains the task info of the currentTask of an ongoing process. If process is ended/completed it will not have value. 
        /// </summary>
        [JsonProperty(PropertyName = "currentTask")]
        public TaskInfo CurrentTask { get; set; }

        /// <summary>
        /// The date time the process was ended/completed. 
        /// </summary>
        [JsonProperty(PropertyName = "ended")]
        public DateTime? Ended { get; set; }

        /// <summary>
        /// Refers to the id of the reached end event of the process. 
        /// </summary>
        [JsonProperty(PropertyName = "endEvent")]
        public string EndEvent { get; set; }
    }
}
