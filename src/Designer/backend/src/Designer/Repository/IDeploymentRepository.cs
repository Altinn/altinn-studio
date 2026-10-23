#nullable disable
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.ViewModels.Request;

namespace Altinn.Studio.Designer.Repository;

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
    /// Calls a procedure to retrieve deployment entities based on query params
    /// </summary>
    Task<IEnumerable<DeploymentEntity>> Get(string org, string app, DocumentQueryModel query);

    /// <summary>
    /// Calls a procedure to retrieve deployment entity based on buildId
    /// </summary>
    Task<DeploymentEntity> Get(string org, string buildId);

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
    /// Gets the time of the latest deploy of each app deployed in the given environment since the given time.
    /// </summary>
    Task<IReadOnlyDictionary<string, DateTimeOffset>> GetLatestDeployTimes(
        string org,
        string environment,
        DateTimeOffset sinceUtc,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Counts the decommissions, across all orgs, that the given developer created since the given time.
    /// </summary>
    Task<int> CountDecommissionsCreatedBySince(
        string createdBy,
        DateTimeOffset sinceUtc,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Calls a function to update deployment entity
    /// </summary>
    Task Update(DeploymentEntity deploymentEntity);

    /// <summary>
    /// Gets a pending decommission deployment for an app in an environment.
    /// A pending decommission is one that doesn't have a final event yet.
    /// </summary>
    Task<DeploymentEntity> GetPendingDecommission(string org, string app, string environment);
}
