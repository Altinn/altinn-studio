using AltinnCore.ServiceLibrary.Enums;

namespace AltinnCore.ServiceLibrary.Models.Workflow
{
    /// <summary>
    /// Class representing the workflow state
    /// </summary>
    public class ServiceState
    {
        /// <summary>
        /// Gets or sets the state of the service
        /// </summary>
        public WorkflowStep State { get; set; }
    }
}
