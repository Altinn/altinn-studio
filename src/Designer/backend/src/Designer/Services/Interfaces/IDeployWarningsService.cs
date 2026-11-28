using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

/// <summary>
/// Tells what a user should know before deploying a release to an environment.
/// </summary>
public interface IDeployWarningsService
{
    /// <summary>
    /// Compares the version of the app libraries the release uses with the version that runs in the environment.
    /// </summary>
    /// <param name="org">The app's organization.</param>
    /// <param name="app">The app's repository.</param>
    /// <param name="tagName">The tag of the release to deploy.</param>
    /// <param name="envName">The environment to deploy to.</param>
    /// <param name="cancellationToken">Cancels the comparison.</param>
    /// <returns>
    /// The warnings, or null when the app has no successfully built release with the tag, or the environment does
    /// not exist.
    /// </returns>
    Task<DeployWarnings?> Get(
        string org,
        string app,
        string tagName,
        string envName,
        CancellationToken cancellationToken
    );
}
