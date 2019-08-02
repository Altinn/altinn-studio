using Newtonsoft.Json;

namespace Storage.Interface.Models
{
    /// <summary>
    /// Holds the process state of an application instance. The process is defined by the application's process specification BPMN file. 
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class ProcessState
    {
        /// <summary>
        /// Refers to the current task id of an ongoing process. If process is completed or is in error it will not have value. 
        /// </summary>
        [JsonProperty(PropertyName = "currentTask", NullValueHandling = NullValueHandling.Ignore)]
        public string CurrentTask { get; set; }

        /// <summary>
        /// If process is completed and in a valid end state the value is true, otherwise false or not present. 
        /// </summary>
        [JsonProperty(PropertyName = "isComplete")]
        public bool? IsComplete { get; set; }

        /// <summary>
        /// If process has reached an error end event this value is true.
        /// </summary>
        [JsonProperty(PropertyName = "isInError")]
        public bool? IsInError { get; set; }

        /// <summary>
        /// Refers to the id of an end state of the process. If the process is completed it should be a valid end state. If process is in error it should be a valid error end event.
        /// </summary>
        [JsonProperty(PropertyName = "endState")]
        public string EndState { get; set; }
    }
}
