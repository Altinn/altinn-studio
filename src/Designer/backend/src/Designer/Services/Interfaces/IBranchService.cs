using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IBranchService
{
    /// <summary>
    /// Deletes a branch. Validates the name, protects the default branch, and refuses to delete the
    /// currently checked out branch.
    /// </summary>
    DeleteBranchResult DeleteBranch(AltinnAuthenticatedRepoEditingContext authenticatedContext, string branchName);

    /// <summary>
    /// Creates a new branch in the given repository.
    /// </summary>
    Task<RepositoryClient.Model.Branch> CreateBranch(AltinnRepoEditingContext editingContext, string branchName);

    /// <summary>
    /// Gets information about the current branch.
    /// </summary>
    CurrentBranchInfo GetCurrentBranch(AltinnRepoEditingContext editingContext);

    /// <summary>
    /// Checks out a branch, validating that there are no uncommitted changes first.
    /// </summary>
    /// <exception cref="Exceptions.UncommittedChangesException">Thrown when there are uncommitted changes</exception>
    RepoStatus CheckoutBranchWithValidation(
        AltinnAuthenticatedRepoEditingContext authenticatedContext,
        string branchName
    );

    /// <summary>
    /// Discards all local changes in the repository (hard reset + clean untracked files).
    /// </summary>
    RepoStatus DiscardLocalChanges(AltinnRepoEditingContext editingContext);

    /// <summary>
    /// Checks out the repository on the specified branch.
    /// </summary>
    void CheckoutRepoOnBranch(AltinnRepoEditingContext editingContext, string branchName);

    /// <summary>
    /// Deletes a local branch based on the specified name, if it exists.
    /// </summary>
    void DeleteLocalBranchIfExists(AltinnRepoEditingContext editingContext, string branchName);

    /// <summary>
    /// Deletes a remote branch based on the specified name, if it exists.
    /// </summary>
    void DeleteRemoteBranchIfExists(AltinnAuthenticatedRepoEditingContext authenticatedContext, string branchName);
}
