using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces;

/// <summary>
/// IApplicationInformationService
/// </summary>
public interface IApplicationInformationService
{
    /// <summary>
    /// Updates application metadata, authorization policy, and text resources for a deployment
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="app">Application</param>
    /// <param name="shortCommitId">Commit Id</param>
    /// <param name="envName">Environment Name</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    Task UpdateApplicationMetadataAndPoliciesAsync(
        string org,
        string app,
        string shortCommitId,
        string envName,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Publishes the app's service resource to Resource Registry
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="app">Application</param>
    /// <param name="shortCommitId">Commit Id</param>
    /// <param name="envName">Environment Name</param>
    /// <returns>Result indicating success or failure with error message</returns>
    Task<ResourceRegistryPublishResult> PublishToResourceRegistryAsync(
        string org,
        string app,
        string shortCommitId,
        string envName
    );
}

/// <summary>
/// Result of publishing to Resource Registry
/// </summary>
/// <param name="Succeeded">Whether the publish was successful</param>
/// <param name="ErrorMessage">Error message if the publish failed</param>
public record ResourceRegistryPublishResult(bool Succeeded, string? ErrorMessage = null);
