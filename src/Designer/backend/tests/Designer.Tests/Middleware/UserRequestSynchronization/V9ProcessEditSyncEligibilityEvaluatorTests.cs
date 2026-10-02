using System;
using System.IO;
using System.Security.Claims;
using System.Xml;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.RepoUserWide.RequestSyncEvaluators;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.RepoUserWide.Services;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Services;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Middleware.UserRequestSynchronization;

public sealed class V9ProcessEditSyncEligibilityEvaluatorTests : IDisposable
{
    private static readonly string[] s_writeMethods = ["POST", "PUT", "PATCH", "DELETE"];
    private static readonly string[] s_readMethods = ["GET", "HEAD", "OPTIONS"];

    private readonly string _repositoriesRoot = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
    private readonly AltinnRepoEditingContext _editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
        "ttd",
        "process-app",
        "testUser"
    );
    private readonly Mock<IAppVersionService> _appVersionService = new();
    private readonly V9ProcessEditSyncEligibilityEvaluator _evaluator = new(
        new RepoUserWideRequestContextResolver(new HttpContextDataExtractor())
    );
    private readonly string _repositoryPath;
    private readonly ServiceProvider _services;

    public V9ProcessEditSyncEligibilityEvaluatorTests()
    {
        var repositoryFactory = new AltinnGitRepositoryFactory(_repositoriesRoot);
        _repositoryPath = repositoryFactory.GetRepositoryPath(
            _editingContext.Org,
            _editingContext.Repo,
            _editingContext.Developer
        );
        Directory.CreateDirectory(_repositoryPath);
        _appVersionService.Setup(service => service.IsV9App(_editingContext)).Returns(true);
        _services = new ServiceCollection()
            .AddSingleton<IAltinnGitRepositoryFactory>(repositoryFactory)
            .AddSingleton(_appVersionService.Object)
            .BuildServiceProvider();
    }

#pragma warning disable CS0618 // The obsolete text endpoints are still in use.
    public static TheoryData<string, string> EligibleActions =>
        new()
        {
            { nameof(ProcessEditingController), nameof(ProcessEditingController.SaveState) },
            { nameof(ProcessModelingController), nameof(ProcessModelingController.UpsertProcessDefinitionAndNotify) },
            { nameof(ProcessModelingController), nameof(ProcessModelingController.AddDataTypeToApplicationMetadata) },
            { nameof(UiFoldersController), nameof(UiFoldersController.UpdateLayoutSetName) },
            { nameof(UiFoldersController), nameof(UiFoldersController.UpdateGlobalTaskNavigation) },
            { nameof(AppDevelopmentController), nameof(AppDevelopmentController.SaveFormLayout) },
            { nameof(AppDevelopmentController), nameof(AppDevelopmentController.SaveValidationOnNavigationLayoutSets) },
            { nameof(LayoutController), nameof(LayoutController.CreatePage) },
            { nameof(ApplicationMetadataController), nameof(ApplicationMetadataController.UpdateApplicationMetadata) },
            { nameof(ConfigController), nameof(ConfigController.SetServiceConfig) },
            { nameof(DatamodelsController), nameof(DatamodelsController.Delete) },
            { nameof(TextController), nameof(TextController.SaveResource) },
            { nameof(TaskNavigationController), nameof(TaskNavigationController.UpdateTaskNavigation) },
            { nameof(PolicyController), nameof(PolicyController.UpdateApplicationPolicy) },
            { nameof(RepositoryController), nameof(RepositoryController.CheckoutBranch) },
            { nameof(RepositoryController), nameof(RepositoryController.DiscardLocalChanges) },
            { nameof(RepositoryController), nameof(RepositoryController.Commit) },
            { nameof(RepositoryController), nameof(RepositoryController.CommitAndPushRepo) },
            { nameof(RepositoryController), nameof(RepositoryController.Push) },
        };
#pragma warning restore CS0618

    [Theory]
    [MemberData(nameof(EligibleActions))]
    public void WriteRequest_ToAV9App_IsEligible(string controller, string action)
    {
        foreach (string method in s_writeMethods)
        {
            Assert.True(_evaluator.IsEligibleForSynchronization(CreateHttpContext(controller, action, method)), method);
        }
    }

    [Theory]
    [MemberData(nameof(EligibleActions))]
    public void ReadRequest_IsNotEligibleAndDoesNotReadTheAppVersion(string controller, string action)
    {
        foreach (string method in s_readMethods)
        {
            Assert.False(
                _evaluator.IsEligibleForSynchronization(CreateHttpContext(controller, action, method)),
                method
            );
        }
        VerifyAppVersionNotRead();
    }

    [Theory]
    [InlineData(nameof(ProcessEditingController), nameof(ProcessEditingController.GetState))]
    [InlineData(nameof(ProcessModelingController), nameof(ProcessModelingController.GetProcessDefinition))]
    [InlineData(nameof(ApplicationMetadataController), nameof(ApplicationMetadataController.GetApplicationMetadata))]
    [InlineData(nameof(PolicyController), nameof(PolicyController.GetAppPolicy))]
    // Existing endpoint rules handle GET pull/reset.
    [InlineData(nameof(RepositoryController), nameof(RepositoryController.Pull))]
    [InlineData(nameof(RepositoryController), nameof(RepositoryController.ResetLocalRepository))]
    public void ReadAction_IsNotEligibleAndDoesNotReadTheAppVersion(string controller, string action)
    {
        Assert.False(_evaluator.IsEligibleForSynchronization(CreateHttpContext(controller, action, "GET")));
        VerifyAppVersionNotRead();
    }

    [Theory]
    [MemberData(nameof(EligibleActions))]
    public void WriteRequest_ToAV8App_IsNotEligible(string controller, string action)
    {
        _appVersionService.Setup(service => service.IsV9App(_editingContext)).Returns(false);

        Assert.False(_evaluator.IsEligibleForSynchronization(CreateHttpContext(controller, action, "PUT")));
    }

    [Theory]
    [InlineData(nameof(RepositoryController.CreateBranch), "POST")]
    [InlineData(nameof(RepositoryController.DeleteBranch), "DELETE")]
    [InlineData(nameof(RepositoryController.CopyApp), "POST")]
    [InlineData(nameof(RepositoryController.CreateApp), "POST")]
    public void UnlistedRepositoryWrite_IsNotEligibleAndSkipsVersionLookup(string action, string method)
    {
        Assert.False(
            _evaluator.IsEligibleForSynchronization(CreateHttpContext(nameof(RepositoryController), action, method))
        );
        VerifyAppVersionNotRead();
    }

    [Fact]
    public void ResourcePolicySave_IsNotEligible()
    {
        Assert.False(
            _evaluator.IsEligibleForSynchronization(
                CreateHttpContext(nameof(PolicyController), nameof(PolicyController.UpdateResourcePolicy), "PUT")
            )
        );
        VerifyAppVersionNotRead();
    }

    [Theory]
    [InlineData(nameof(OptionsController), nameof(OptionsController.UploadFile))]
    [InlineData(nameof(DeploymentsController), nameof(DeploymentsController.Create))]
    public void UnrelatedControllerWrite_IsNotEligibleAndSkipsVersionLookup(string controller, string action)
    {
        Assert.False(_evaluator.IsEligibleForSynchronization(CreateHttpContext(controller, action, "POST")));
        VerifyAppVersionNotRead();
    }

    [Fact]
    public void RequestWithoutAControllerAction_IsNotEligible()
    {
        var httpContext = new DefaultHttpContext { RequestServices = _services };
        httpContext.Request.Method = "PUT";

        Assert.False(_evaluator.IsEligibleForSynchronization(httpContext));
        VerifyAppVersionNotRead();
    }

    [Fact]
    public void WriteRequest_WithoutAClone_IsNotEligible()
    {
        Directory.Delete(_repositoryPath);

        Assert.False(
            _evaluator.IsEligibleForSynchronization(
                CreateHttpContext(
                    nameof(ApplicationMetadataController),
                    nameof(ApplicationMetadataController.UpdateApplicationMetadata),
                    "PUT"
                )
            )
        );
        VerifyAppVersionNotRead();
    }

    [Fact]
    public void WriteRequest_WhenVersionLookupFails_IsEligible()
    {
        _appVersionService
            .Setup(service => service.IsV9App(_editingContext))
            .Throws(new XmlException("The project file is not valid XML."));

        Assert.True(
            _evaluator.IsEligibleForSynchronization(
                CreateHttpContext(nameof(PolicyController), nameof(PolicyController.UpdateApplicationPolicy), "PUT")
            )
        );
    }

    private HttpContext CreateHttpContext(string controllerTypeName, string actionName, string method)
    {
        var actionDescriptor = new ControllerActionDescriptor
        {
            ControllerName = controllerTypeName[..^"Controller".Length],
            ActionName = actionName,
        };
        var httpContext = new DefaultHttpContext { RequestServices = _services };
        httpContext.SetEndpoint(new Endpoint(null, new EndpointMetadataCollection(actionDescriptor), actionName));
        httpContext.Request.Method = method;
        httpContext.Request.RouteValues["org"] = _editingContext.Org;
        httpContext.Request.RouteValues["app"] = _editingContext.Repo;
        httpContext.User = new ClaimsPrincipal(
            new ClaimsIdentity([new Claim(ClaimTypes.Name, _editingContext.Developer)])
        );
        return httpContext;
    }

    private void VerifyAppVersionNotRead() =>
        _appVersionService.Verify(service => service.IsV9App(It.IsAny<AltinnRepoEditingContext>()), Times.Never);

    public void Dispose()
    {
        _services.Dispose();
        Directory.Delete(_repositoriesRoot, recursive: true);
    }
}
