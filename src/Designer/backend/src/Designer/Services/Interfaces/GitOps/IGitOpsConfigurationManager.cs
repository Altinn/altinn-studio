using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces.GitOps;

/// <summary>
/// Manages the GitOps configuration for Altinn organizations.
/// </summary>
public interface IGitOpsConfigurationManager
{
    /// <summary>
    /// Ensures that the GitOps configuration exists for the specified organization.
    /// </summary>
    /// <param name="context">The <see cref="AltinnOrgEditingContext"/> representing the organization editing context.</param>
    /// <param name="environment">The <see cref="AltinnEnvironment"/> to ensure configuration exists for.</param>
    public Task EnsureGitOpsConfigurationExists(AltinnOrgEditingContext context, AltinnEnvironment environment);

    /// <summary>
    /// Checks if the application exists in the GitOps configuration for the given environment.
    /// </summary>
    /// <param name="context">The <see cref="AltinnOrgEditingContext"/> context.</param>
    /// <param name="altinnRepoName">Name of the app.</param>
    /// <param name="environment">The <see cref="AltinnEnvironment"/> to check against.</param>
    /// <returns>True if the application exists in the configuration; otherwise, false.</returns>
    public Task<bool> AppExistsInGitOpsConfiguration(AltinnOrgEditingContext context, AltinnRepoName altinnRepoName, AltinnEnvironment environment);

    /// <summary>
    /// Adds the application to the GitOps configuration for the specified environment.
    /// </summary>
    /// <param name="context">The <see cref="AltinnRepoEditingContext"/> representing the repository editing context.</param>
    /// <param name="environment">The <see cref="AltinnEnvironment"/> to add the application to.</param>
    public Task AddAppToGitOpsConfiguration(AltinnRepoEditingContext context, AltinnEnvironment environment);

    /// <summary>
    /// Removes the application from the GitOps configuration for the specified environment.
    /// </summary>
    /// <param name="context">The <see cref="AltinnRepoEditingContext"/> representing the repository editing context.</param>
    /// <param name="environment">The <see cref="AltinnEnvironment"/> to remove the application from.</param>
    public Task RemoveAppFromGitOpsEnvironmentConfiguration(AltinnRepoEditingContext context, AltinnEnvironment environment);

    /// <summary>
    /// Persists the GitOps configuration for the organization and environment.
    /// </summary>
    /// <param name="context">The <see cref="AltinnOrgEditingContext"/> representing the organization editing context.</param>
    /// <param name="environment">The <see cref="AltinnEnvironment"/> to persist the configuration for.</param>
    public Task PersistGitOpsConfiguration(AltinnOrgEditingContext context, AltinnEnvironment environment);
}

