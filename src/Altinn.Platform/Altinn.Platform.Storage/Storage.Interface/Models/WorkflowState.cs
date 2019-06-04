using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Text;

namespace Storage.Interface.Models
{
    /// <summary>
    /// Holds the workflow state. 
    /// </summary>
    public class WorkflowState
    {
        /// <summary>
        /// the current workflow step
        /// </summary>
        [JsonProperty(PropertyName = "currentStep")]
        public string CurrentStep { get; set; }

        /// <summary>
        /// If workflow is completed the value should be true, otherwise false.
        /// </summary>
        [JsonProperty(PropertyName = "isComplete")]
        public bool IsComplete { get; set; }
    }
}
