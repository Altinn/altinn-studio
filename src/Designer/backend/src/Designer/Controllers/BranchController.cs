using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[Route(
    "designer/api/repos/repo/{org}/{repository:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/branches"
)]
public class BranchController(IBranchService branchService) : ControllerBase
{
    [HttpDelete("{**branchName}")]
    public async Task<ActionResult> DeleteBranch(string org, string repository, [FromRoute] string branchName)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        string token = await HttpContext.GetDeveloperAppTokenAsync();
        AltinnAuthenticatedRepoEditingContext authenticatedContext =
            AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(org, repository, developer, token);

        DeleteBranchResult result = branchService.DeleteBranch(authenticatedContext, branchName);

        return result switch
        {
            DeleteBranchResult.Success => NoContent(),
            DeleteBranchResult.InvalidBranchName => BadRequest($"{branchName} is an invalid branch name."),
            DeleteBranchResult.DefaultBranchProtected => BadRequest("Cannot delete the default branch."),
            DeleteBranchResult.CheckedOutBranchProtected => BadRequest(
                "Cannot delete the currently checked out branch."
            ),
            _ => StatusCode(500),
        };
    }
}
