using System;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class BranchService(ISourceControl sourceControl) : IBranchService
{
    private readonly ISourceControl _sourceControl = sourceControl;

    public DeleteBranchResult DeleteBranch(
        AltinnAuthenticatedRepoEditingContext authenticatedContext,
        string branchName
    )
    {
        if (string.IsNullOrWhiteSpace(branchName))
        {
            return DeleteBranchResult.InvalidBranchName;
        }

        try
        {
            Guard.AssertValidRepoBranchName(branchName);
        }
        catch (ArgumentException)
        {
            return DeleteBranchResult.InvalidBranchName;
        }

        if (branchName == General.DefaultBranch)
        {
            return DeleteBranchResult.DefaultBranchProtected;
        }

        AltinnRepoEditingContext editingContext = authenticatedContext.RepoEditingContext;
        CurrentBranchInfo currentBranch = _sourceControl.GetCurrentBranch(editingContext);
        if (currentBranch.BranchName == branchName)
        {
            return DeleteBranchResult.CheckedOutBranchProtected;
        }

        _sourceControl.DeleteRemoteBranchIfExists(authenticatedContext, branchName);
        _sourceControl.DeleteLocalBranchIfExists(editingContext, branchName);

        return DeleteBranchResult.Success;
    }
}
