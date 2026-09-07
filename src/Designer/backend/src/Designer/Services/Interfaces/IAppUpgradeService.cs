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
    /// Clones or refreshes the developer's copy of the app and checks that the automatic upgrade can run on it.
    /// </summary>
    Task<AppUpgradePreparation> PrepareAsync(
        AltinnAuthenticatedRepoEditingContext authenticatedContext,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Runs the automatic upgrade on the developer's local clone, commits and pushes the result when it applied,
    /// and reports what is left to do by hand.
    /// </summary>
    Task<AppUpgradeResult> RunAsync(
        AltinnAuthenticatedRepoEditingContext authenticatedContext,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Merges the pull request opened by <see cref="RunAsync"/> into the default branch and moves the developer's
    /// local clone back onto it.
    /// </summary>
    Task<AppUpgradeMergeResult> MergeAsync(
        AltinnAuthenticatedRepoEditingContext authenticatedContext,
        AppUpgradeMergeRequest request,
        CancellationToken cancellationToken
    );
}
