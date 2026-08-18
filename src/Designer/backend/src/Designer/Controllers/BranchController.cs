using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

/// <summary>
/// API controller for branch operations on an app repository.
/// </summary>
[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[Route("designer/api/{org}/{repository:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/branches")]
public class BranchController : ControllerBase
{
    private readonly IGiteaClient _giteaClient;
    private readonly IBranchService _branchService;

    /// <summary>
    /// Initializes a new instance of the <see cref="BranchController"/> class.
    /// </summary>
    /// <param name="giteaClient">The gitea client</param>
    /// <param name="branchService">The branch service</param>
    public BranchController(IGiteaClient giteaClient, IBranchService branchService)
    {
        _giteaClient = giteaClient;
        _branchService = branchService;
    }

    /// <summary>
    /// Returns a list of branches in the repository
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="repository">The name of repository</param>
    /// <returns>List of branches</returns>
    [HttpGet]
    [Route("")]
    public async Task<ActionResult<List<Branch>>> Branches(string org, string repository)
    {
        try
        {
            List<Branch> branches = await _giteaClient.GetBranches(org, repository);
            if (branches == null || branches.Count == 0)
            {
                return NoContent();
            }
            return Ok(branches);
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>
    /// Returns information about a given branch
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="repository">The name of repository</param>
    /// <param name="branchName">Name of branch</param>
    /// <returns>The branch info</returns>
    [HttpGet]
    [Route("{**branchName}")]
    public async Task<Branch> Branch(string org, string repository, [FromRoute] string branchName) =>
        await _giteaClient.GetBranch(org, repository, branchName);

    /// <summary>
    /// Gets information about the current branch
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="repository">The name of repository</param>
    /// <returns>Information about the current branch</returns>
    [HttpGet]
    [Route("current")]
    public ActionResult<CurrentBranchInfo> GetCurrentBranch(string org, string repository)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            org,
            repository,
            developer
        );
        var branchInfo = _branchService.GetCurrentBranch(editingContext);
        return Ok(branchInfo);
    }

    /// <summary>
    /// Creates a new branch and checks it out in a single operation
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="repository">The name of repository</param>
    /// <param name="request">The branch creation request</param>
    /// <returns>The updated repository status</returns>
    [HttpPost]
    [Route("create-and-checkout")]
    public async Task<ActionResult<RepoStatus>> CreateAndCheckoutBranch(
        string org,
        string repository,
        [FromBody] CreateBranchRequest request
    )
    {
        if (string.IsNullOrWhiteSpace(request?.BranchName))
        {
            return BadRequest("Branch name is required");
        }

        try
        {
            Guard.AssertValidRepoBranchName(request.BranchName);
        }
        catch (ArgumentException)
        {
            return BadRequest($"{request.BranchName} is an invalid branch name.");
        }

        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        string token = await HttpContext.GetDeveloperAppTokenAsync();
        AltinnAuthenticatedRepoEditingContext authenticatedContext =
            AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(org, repository, developer, token);
        RepoStatus repoStatus = await _branchService.CreateAndCheckoutBranch(authenticatedContext, request.BranchName);
        return Ok(repoStatus);
    }

    /// <summary>
    /// Deletes a branch from the repository
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="repository">The name of repository</param>
    /// <param name="branchName">The name of the branch to delete</param>
    [HttpDelete]
    [Route("{**branchName}")]
    public async Task<ActionResult> DeleteBranch(string org, string repository, [FromRoute] string branchName)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        string token = await HttpContext.GetDeveloperAppTokenAsync();
        AltinnAuthenticatedRepoEditingContext authenticatedContext =
            AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(org, repository, developer, token);

        DeleteBranchResult result = _branchService.DeleteBranch(authenticatedContext, branchName);

        return result switch
        {
            DeleteBranchResult.Success => NoContent(),
            DeleteBranchResult.InvalidBranchName => BadRequest($"{branchName} is an invalid branch name."),
            DeleteBranchResult.DefaultBranchProtected => BadRequest("Cannot delete the default branch."),
            _ => StatusCode(500),
        };
    }

    /// <summary>
    /// Checks out a specific branch
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="repository">The name of repository</param>
    /// <param name="request">The checkout request</param>
    /// <returns>The updated repository status</returns>
    [HttpPost]
    [Route("checkout")]
    public async Task<ActionResult<RepoStatus>> CheckoutBranch(
        string org,
        string repository,
        [FromBody] CheckoutBranchRequest request
    )
    {
        if (string.IsNullOrWhiteSpace(request?.BranchName))
        {
            return BadRequest("Branch name is required");
        }

        try
        {
            Guard.AssertValidRepoBranchName(request.BranchName);
        }
        catch (ArgumentException)
        {
            return BadRequest($"{request.BranchName} is an invalid branch name.");
        }

        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        string token = await HttpContext.GetDeveloperAppTokenAsync();
        AltinnAuthenticatedRepoEditingContext authenticatedContext =
            AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(org, repository, developer, token);
        RepoStatus repoStatus = _branchService.CheckoutBranchWithValidation(authenticatedContext, request.BranchName);
        return Ok(repoStatus);
    }

    /// <summary>
    /// Discards all local changes and checks out the target branch in a single operation
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="repository">The name of repository</param>
    /// <param name="request">The checkout request</param>
    /// <returns>The updated repository status</returns>
    [HttpPost]
    [Route("discard-and-checkout")]
    public async Task<ActionResult<RepoStatus>> DiscardAndCheckoutBranch(
        string org,
        string repository,
        [FromBody] CheckoutBranchRequest request
    )
    {
        if (string.IsNullOrWhiteSpace(request?.BranchName))
        {
            return BadRequest("Branch name is required");
        }

        try
        {
            Guard.AssertValidRepoBranchName(request.BranchName);
        }
        catch (ArgumentException)
        {
            return BadRequest($"{request.BranchName} is an invalid branch name.");
        }

        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        string token = await HttpContext.GetDeveloperAppTokenAsync();
        AltinnAuthenticatedRepoEditingContext authenticatedContext =
            AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(org, repository, developer, token);
        RepoStatus repoStatus = _branchService.DiscardChangesAndCheckout(authenticatedContext, request.BranchName);
        return Ok(repoStatus);
    }
}
