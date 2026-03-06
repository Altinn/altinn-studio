#nullable disable
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.ViewModels.Request;

namespace Altinn.Studio.Designer.Repository
{
    /// <summary>
    /// Interface
    /// </summary>
    public interface IDeploymentRepository
    {
        /// <summary>
        /// Creates an deployment entity in repository
        /// </summary>
        /// <param name="deploymentEntity">the deployment entity object</param>
        /// <returns>deploymentEntity</returns>
        Task<DeploymentEntity> Create(DeploymentEntity deploymentEntity);

        /// <summary>
        /// Creates a deployment entity with protected dispatch state.
        /// </summary>
        /// <param name="deploymentEntity">the deployment entity object</param>
        /// <param name="protectedDispatchToken">Protected developer token used until dispatch completes.</param>
        /// <returns>deploymentEntity</returns>
        Task<DeploymentEntity> Create(DeploymentEntity deploymentEntity, string protectedDispatchToken);

        /// <summary>
        /// Calls a procedure to retrieve deployment entities based on query params
        /// </summary>
        Task<IEnumerable<DeploymentEntity>> Get(string org, string app, DocumentQueryModel query);

        /// <summary>
        /// Calls a procedure to retrieve deployment entity based on buildId
        /// </summary>
        Task<DeploymentEntity> Get(string org, string buildId);

        /// <summary>
        /// Calls a procedure to retrieve deployment entity based on the external executor build id.
        /// </summary>
        Task<DeploymentEntity> GetByExternalBuildId(string org, string externalBuildId);

        /// <summary>
        /// Gets the last deployed entity on environment
        /// </summary>
        Task<DeploymentEntity> GetLastDeployed(string org, string app, string environment);

        /// <summary>
        /// Get all deployments for an app in an environment
        /// </summary>
        Task<IEnumerable<DeploymentEntity>> GetSucceeded(
            string org,
            string app,
            string environment,
            DocumentQueryModel query
        );

        /// <summary>
        /// Gets app names with a recent deploy in the given environment.
        /// </summary>
        Task<IReadOnlyList<string>> GetAppsWithRecentDeployments(
            string org,
            string environment,
            DateTimeOffset sinceUtc
        );

        /// <summary>
        /// Calls a function to update deployment entity
        /// </summary>
        Task Update(DeploymentEntity deploymentEntity);

        /// <summary>
        /// Calls a function to update deployment entity and optionally clear dispatch state.
        /// </summary>
        Task Update(DeploymentEntity deploymentEntity, bool clearDispatchState);

        /// <summary>
        /// Atomically claims a single pending deployment dispatch if it is eligible for dispatch.
        /// </summary>
        Task<ClaimedDeploymentDispatch> TryClaimPendingDispatch(
            string org,
            string workflowId,
            DateTimeOffset nowUtc,
            DateTimeOffset staleBeforeUtc,
            CancellationToken cancellationToken = default
        );

        /// <summary>
        /// Atomically claims a batch of pending deployment dispatches.
        /// </summary>
        Task<IReadOnlyList<ClaimedDeploymentDispatch>> ClaimPendingDispatches(
            int maxCount,
            DateTimeOffset nowUtc,
            DateTimeOffset staleBeforeUtc,
            CancellationToken cancellationToken = default
        );

        /// <summary>
        /// Gets deployments with an external build id that still need polling recovery.
        /// </summary>
        Task<IReadOnlyList<DeploymentEntity>> GetDeploymentsNeedingPollingRecovery(
            int maxCount,
            CancellationToken cancellationToken = default
        );

        /// <summary>
        /// Gets a pending decommission deployment for an app in an environment.
        /// A pending decommission is one that doesn't have a final event yet.
        /// </summary>
        Task<DeploymentEntity> GetPendingDecommission(string org, string app, string environment);
    }
}
