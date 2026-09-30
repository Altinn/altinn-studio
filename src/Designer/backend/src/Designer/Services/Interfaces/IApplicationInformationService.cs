using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

/// <summary>
/// IApplicationInformationService
/// </summary>
public interface IApplicationInformationService
{
    /// <summary>
    /// Updates application metadata, authorization policy, and text resources for a deployment
    /// </summary>
    /// <param name="org">Organization</param>
    /// <param name="app">Application</param>
    /// <param name="shortCommitId">Commit Id</param>
    /// <param name="envName">Environment Name</param>
    /// <param name="appStatus">App status to register in Storage</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    Task UpdateApplicationMetadataAndPoliciesAsync(
        string org,
        string app,
        string shortCommitId,
        string envName,
        AppStatus appStatus,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Publishes the app's service resource to Resource Registry
    /// </summary>
    /// <param name="org">Organization</param>
    /// <param name="app">Application</param>
    /// <param name="shortCommitId">Commit Id</param>
    /// <param name="envName">Environment Name</param>
    /// <param name="appStatus">App status to register in Resource Registry</param>
    /// <returns>Result indicating success or failure with error message</returns>
    Task<ResourceRegistryPublishResult> PublishToResourceRegistryAsync(
        string org,
        string app,
        string shortCommitId,
        string envName,
        AppStatus appStatus
    );

    /// <summary>
    /// Sets the status of the app's existing service resource in Resource Registry
    /// </summary>
    /// <param name="org">Organization</param>
    /// <param name="app">Application</param>
    /// <param name="envName">Environment Name</param>
    /// <param name="appStatus">App status to register in Resource Registry</param>
    /// <returns>Result indicating success or failure with error message</returns>
    Task<ResourceRegistryPublishResult> UpdateResourceRegistryStatusAsync(
        string org,
        string app,
        string envName,
        AppStatus appStatus
    );
}

/// <summary>
/// Result of publishing to Resource Registry
/// </summary>
/// <param name="Succeeded">Whether the publish was successful</param>
/// <param name="ErrorMessage">Error message if the publish failed</param>
public record ResourceRegistryPublishResult(bool Succeeded, string? ErrorMessage = null);
