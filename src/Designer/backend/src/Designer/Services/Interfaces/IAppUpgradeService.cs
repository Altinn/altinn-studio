using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto.AppUpgrade;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IAppUpgradeService
{
    /// <summary>
    /// Reads the app's current versions from the remote repository and tells whether an upgrade is available.
    /// </summary>
    Task<AppUpgradeStatus> GetStatusAsync(AltinnRepoContext repoContext, CancellationToken cancellationToken);

    /// <summary>
    /// Starts an automatic upgrade by pushing a workflow to a new branch in the app repository, where a Gitea
    /// Actions runner performs the upgrade and opens a pull request.
    /// </summary>
    Task<AppUpgradeStart> StartAsync(AltinnRepoContext repoContext, CancellationToken cancellationToken);

    /// <summary>
    /// Reports how far the upgrade started by <see cref="StartAsync"/> on the given branch has come, including the
    /// final result once the workflow run has completed.
    /// </summary>
    Task<AppUpgradeRun> GetRunAsync(
        AltinnRepoContext repoContext,
        string branchName,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Merges the pull request opened by the upgrade into the default branch and refreshes the developer's local
    /// clone.
    /// </summary>
    Task<AppUpgradeMergeResult> MergeAsync(
        AltinnAuthenticatedRepoEditingContext authenticatedContext,
        AppUpgradeMergeRequest request,
        CancellationToken cancellationToken
    );
}
