using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.RepoUserWide.RequestSyncEvaluators;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Controllers;
using Xunit;

namespace Designer.Tests.Middleware.UserRequestSynchronization;

public class EndpointNameSyncEligibilityEvaluatorTests
{
    // Serialize these actions with BPMN saves for the same repository. They read process.bpmn, which the
    // save operation locks exclusively.
    [Theory]
    [InlineData(nameof(UiFoldersController.AddLayoutSet))]
    public void IsEligibleForSynchronization_AllowedUiFoldersAction_ReturnsTrue(string actionName)
    {
        var evaluator = new EndpointNameSyncEligibilityEvaluator();

        bool isEligible = evaluator.IsEligibleForSynchronization(CreateHttpContext("UiFolders", actionName));

        Assert.True(isEligible);
    }

    // Reading the repository status writes the index, so every action that writes the index must hold the lock too.
    [Theory]
    [InlineData(nameof(RepositoryController.RepoStatus))]
    [InlineData(nameof(RepositoryController.Pull))]
    [InlineData(nameof(RepositoryController.ResetLocalRepository))]
    [InlineData(nameof(RepositoryController.CommitAndPushRepo))]
    [InlineData(nameof(RepositoryController.Commit))]
    [InlineData(nameof(RepositoryController.CheckoutBranch))]
    [InlineData(nameof(RepositoryController.DeleteBranch))]
    [InlineData(nameof(RepositoryController.DiscardLocalChanges))]
    [InlineData(nameof(RepositoryController.StageChange))]
    public void IsEligibleForSynchronization_RepositoryActionThatUsesTheIndex_ReturnsTrue(string actionName)
    {
        var evaluator = new EndpointNameSyncEligibilityEvaluator();

        bool isEligible = evaluator.IsEligibleForSynchronization(CreateHttpContext("Repository", actionName));

        Assert.True(isEligible);
    }

    [Fact]
    public void IsEligibleForSynchronization_UnsupportedAction_ReturnsFalse()
    {
        var evaluator = new EndpointNameSyncEligibilityEvaluator();

        bool isEligible = evaluator.IsEligibleForSynchronization(
            CreateHttpContext("UiFolders", nameof(UiFoldersController.GetLayoutSets))
        );

        Assert.False(isEligible);
    }

    [Fact]
    public void IsEligibleForSynchronization_NoControllerEndpoint_ReturnsFalse()
    {
        var evaluator = new EndpointNameSyncEligibilityEvaluator();

        bool isEligible = evaluator.IsEligibleForSynchronization(new DefaultHttpContext());

        Assert.False(isEligible);
    }

    private static HttpContext CreateHttpContext(string controllerName, string actionName)
    {
        var actionDescriptor = new ControllerActionDescriptor
        {
            ControllerName = controllerName,
            ActionName = actionName,
        };
        var endpoint = new Endpoint(null, new EndpointMetadataCollection(actionDescriptor), actionName);
        var httpContext = new DefaultHttpContext();
        httpContext.SetEndpoint(endpoint);
        return httpContext;
    }
}
