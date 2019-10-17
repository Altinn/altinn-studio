using Altinn.App.Services.Enums;

namespace Altinn.App.Services.Models.Workflow
{
    /// <summary>
    /// Class detailing a workflow step
    /// </summary>
    public class WorkFlowStep
    {
        /// <summary>
        /// Gets or sets the workflow step type
        /// </summary>
        public StepType StepType { get; set; }
    }
}
