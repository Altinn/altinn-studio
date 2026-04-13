using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IBranchService
{
    DeleteBranchResult DeleteBranch(AltinnAuthenticatedRepoEditingContext authenticatedContext, string branchName);
}
