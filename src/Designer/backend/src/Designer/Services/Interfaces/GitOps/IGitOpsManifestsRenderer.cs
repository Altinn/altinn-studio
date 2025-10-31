#nullable disable
using System.Collections.Generic;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces.GitOps;

/// <summary>
/// Renders GitOps manifests.
/// </summary>
public interface IGitOpsManifestsRenderer
{
    /// <summary>
    /// Gets the base manifests.
    /// </summary>
    /// <returns>Dictionary of manifests where keys are relative file paths and values are content of the file.</returns>
    Dictionary<string, string> GetBaseManifests();

    /// <summary>
    /// Gets the application-specific manifests for the provided repository context.
    /// </summary>
    /// <param name="context">The <see cref="AltinnRepoContext"/> containing information about the application.</param>
    /// <returns>
    /// A dictionary where the key is the relative file path and the value is the content of the manifest file.
    /// </returns>
    Dictionary<string, string> GetAppManifests(AltinnRepoContext context);

    /// <summary>
    /// Gets the environment overlay manifests for the specified environment and set of applications.
    /// </summary>
    /// <param name="environment">The <see cref="AltinnEnvironment"/> holding the target Altinn environment.</param>
    /// <param name="apps">A set of application repository names to include in the overlay.</param>
    /// <returns>
    /// A dictionary where the key is the relative file path and the value is the content of the manifest file.
    /// </returns>
    Dictionary<string, string> GetEnvironmentOverlayManifests(AltinnEnvironment environment, HashSet<AltinnRepoName> apps);
}
