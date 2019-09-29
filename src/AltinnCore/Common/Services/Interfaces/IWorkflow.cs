using System;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models.Workflow;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Interface for workflow functionality
    /// </summary>
    public interface IWorkflow
    {
        /// <summary>
        /// This method initializes the app state and saves the initial status to disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The current app state</returns>
        ServiceState GetInitialServiceState(string org, string app);

        /// <summary>
        /// This method returns the correct url given the current state
        /// </summary>
        /// <param name="instanceId">The instance id</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="currentState">The current state of the form</param>
        /// <returns>The url to redirect the user to</returns>
        string GetUrlForCurrentState(Guid instanceId, string org, string app, WorkflowStep currentState);

        /// <summary>
        /// This method moves the app forward in the workflow by updating the state
        /// </summary>
        /// <param name="instanceId">The instance id</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <returns>The new current service state</returns>
        ServiceState MoveServiceForwardInWorkflow(Guid instanceId, string org, string app, int instanceOwnerId);

        /// <summary>
        /// This method figures out the current state of an app instance
        /// </summary>
        /// <param name="instanceId">The instance id</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <returns>The current app state</returns>
        ServiceState GetCurrentState(Guid instanceId, string org, string app, int instanceOwnerId);
    }
}
