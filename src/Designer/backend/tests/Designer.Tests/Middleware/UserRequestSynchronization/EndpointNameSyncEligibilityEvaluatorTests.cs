using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.RepoUserWide.RequestSyncEvaluators;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Controllers;
using Xunit;

namespace Designer.Tests.Middleware.UserRequestSynchronization;

public class EndpointNameSyncEligibilityEvaluatorTests
{
    // Both read process.bpmn, which the BPMN save writes with an exclusive lock, so they must not run
    // alongside it for the same repository.
    [Theory]
    [InlineData(nameof(UiFoldersController.GetSubformComponents))]
    [InlineData(nameof(UiFoldersController.SaveSubformPdfComponent))]
    [InlineData(nameof(UiFoldersController.AddLayoutSet))]
    public void IsEligibleForSynchronization_WhitelistedUiFoldersAction_ReturnsTrue(string actionName)
    {
        var evaluator = new EndpointNameSyncEligibilityEvaluator();

        bool isEligible = evaluator.IsEligibleForSynchronization(CreateHttpContext("UiFolders", actionName));

        Assert.True(isEligible);
    }

    [Fact]
    public void IsEligibleForSynchronization_ActionOutsideWhitelist_ReturnsFalse()
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
