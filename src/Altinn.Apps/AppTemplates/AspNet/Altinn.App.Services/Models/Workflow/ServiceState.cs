using Altinn.App.Services.Enums;

namespace Altinn.App.Services.Workflow
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
