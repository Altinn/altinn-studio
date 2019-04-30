using System;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models.Workflow;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Interface for the workflow service
    /// </summary>
    public interface IWorkflow
    {
        /// <summary>
        /// This method initializes the service state and saves the initial status to disk
        /// </summary>
        /// <param name="applicationOwnerId">The application owner id</param>
        /// <param name="applicationId">The application id</param>
        /// <returns>The current service state</returns>
        ServiceState GetInitialServiceState(string applicationOwnerId, string applicationId);

        /// <summary>
        /// This method returns the correct url given the current state
        /// </summary>
        /// <param name="instanceId">The instance id</param>
        /// <param name="applicationOwnerId">The application owner id</param>
        /// <param name="applicationId">The application id</param>
        /// <param name="currentState">The current state of the form</param>
        /// <returns>The url to redirect the user to</returns>
        string GetUrlForCurrentState(Guid instanceId, string applicationOwnerId, string applicationId, WorkflowStep currentState);

        /// <summary>
        /// This method moves the service forward in the workflow by updating the state
        /// </summary>
        /// <param name="instanceId">The instance id</param>
        /// <param name="applicationOwnerId">The application owner id</param>
        /// <param name="applicationId">The application id</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <returns>The new current service state</returns>
        ServiceState MoveServiceForwardInWorkflow(Guid instanceId, string applicationOwnerId, string applicationId, int instanceOwnerId);

        /// <summary>
        /// This method figures out the current state of a service instance
        /// </summary>
        /// <param name="instanceId">The instance id</param>
        /// <param name="applicationOwnerId">The application owner id</param>
        /// <param name="applicationId">The application id</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <returns>The current service state</returns>
        ServiceState GetCurrentState(Guid instanceId, string applicationOwnerId, string applicationId, int instanceOwnerId);
    }
}
