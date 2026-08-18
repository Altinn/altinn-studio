using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IBranchService
{
    /// <summary>
    /// Deletes a branch. Validates the name and protects the default branch. When the branch being
    /// deleted is the currently checked out branch, local changes are discarded and the default branch
    /// is checked out before the branch is removed.
    /// </summary>
    DeleteBranchResult DeleteBranch(AltinnAuthenticatedRepoEditingContext authenticatedContext, string branchName);

    /// <summary>
    /// Creates a new branch and checks it out in a single operation.
    /// </summary>
    /// <exception cref="Exceptions.UncommittedChangesException">Thrown when there are uncommitted changes</exception>
    Task<RepoStatus> CreateAndCheckoutBranch(
        AltinnAuthenticatedRepoEditingContext authenticatedContext,
        string branchName
    );

    /// <summary>
    /// Discards all local changes and then checks out the target branch in a single operation.
    /// </summary>
    /// <exception cref="Exceptions.UncommittedChangesException">Thrown when there are uncommitted changes</exception>
    RepoStatus DiscardChangesAndCheckout(
        AltinnAuthenticatedRepoEditingContext authenticatedContext,
        string targetBranch
    );

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
