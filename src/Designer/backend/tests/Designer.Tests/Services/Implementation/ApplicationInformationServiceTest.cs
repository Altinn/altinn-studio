#nullable enable
using System.Threading;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace Designer.Tests.Services.Implementation;

public class ApplicationInformationServiceTest
{
    private const string Org = "ttd";
    private const string App = "test-app";
    private const string Commit = "abcd1234";
    private const string Environment = "tt02";
    private const string PolicyFile = "<Policy>[ORG]/[APP]</Policy>";
    private const string ResourceId = "app_ttd_test-app";

    private readonly Mock<IApplicationMetadataService> _applicationMetadataServiceMock = new();
    private readonly Mock<IAuthorizationPolicyService> _authorizationPolicyServiceMock = new();
    private readonly Mock<IResourceRegistry> _resourceRegistryMock = new();
    private readonly ApplicationInformationService _service;

    public ApplicationInformationServiceTest()
    {
        _applicationMetadataServiceMock
            .Setup(service => service.GetApplicationMetadataJsonFromSpecificReference(Org, App, Commit))
            .ReturnsAsync($$"""{"id": "{{Org}}/{{App}}"}""");
        _authorizationPolicyServiceMock
            .Setup(service => service.GetAuthorizationPolicyFileFromGitea(Org, App, Commit))
            .ReturnsAsync(PolicyFile);
        _authorizationPolicyServiceMock
            .Setup(service => service.ReplacePolicyPlaceholderTokens(PolicyFile, Org, App))
            .Returns(PolicyFile);
        _resourceRegistryMock
            .Setup(registry =>
                registry.PublishServiceResource(It.IsAny<ServiceResource>(), Environment, It.IsAny<byte[]>())
            )
            .ReturnsAsync(new StatusCodeResult(201));

        Mock<IOrgService> orgServiceMock = new();
        orgServiceMock
            .Setup(service => service.GetOrg(Org))
            .ReturnsAsync(new Altinn.ResourceRegistry.Core.Models.Org());

        _service = new ApplicationInformationService(
            _applicationMetadataServiceMock.Object,
            _authorizationPolicyServiceMock.Object,
            Mock.Of<ITextResourceService>(),
            _resourceRegistryMock.Object,
            orgServiceMock.Object,
            Mock.Of<IEnvironmentsService>()
        );
    }

    [Theory]
    [InlineData("tt02", "tt02")]
    [InlineData("production", "prod")]
    public async Task UpdateResourceRegistryStatusAsync_ResourceExists_PublishesResourceWithStatus(
        string envName,
        string expectedResourceRegistryEnvName
    )
    {
        // Arrange
        var resourceRegistry = new Mock<IResourceRegistry>();
        var existingResource = new ServiceResource { Identifier = ResourceId, Status = nameof(AppStatus.Completed) };
        resourceRegistry
            .Setup(r => r.GetResource(ResourceId, expectedResourceRegistryEnvName))
            .ReturnsAsync(existingResource);
        resourceRegistry
            .Setup(r => r.PublishServiceResource(It.IsAny<ServiceResource>(), It.IsAny<string>(), null))
            .ReturnsAsync(new StatusCodeResult(200));
        ApplicationInformationService service = CreateService(resourceRegistry);

        // Act
        ResourceRegistryPublishResult result = await service.UpdateResourceRegistryStatusAsync(
            Org,
            App,
            envName,
            AppStatus.Deprecated
        );

        // Assert
        Assert.True(result.Succeeded);
        resourceRegistry.Verify(
            r =>
                r.PublishServiceResource(
                    It.Is<ServiceResource>(resource =>
                        resource.Identifier == ResourceId && resource.Status == nameof(AppStatus.Deprecated)
                    ),
                    expectedResourceRegistryEnvName,
                    null
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task UpdateAndPublish_ForOneDeploy_ReadEachFileFromGiteaOnce()
    {
        await _service.UpdateApplicationMetadataAndPoliciesAsync(Org, App, Commit, Environment, AppStatus.Completed);
        ResourceRegistryPublishResult result = await _service.PublishToResourceRegistryAsync(
            Org,
            App,
            Commit,
            Environment,
            AppStatus.Completed
        );

        Assert.True(result.Succeeded);
        _applicationMetadataServiceMock.Verify(
            service => service.GetApplicationMetadataJsonFromSpecificReference(Org, App, Commit),
            Times.Once
        );
        _authorizationPolicyServiceMock.Verify(
            service => service.GetAuthorizationPolicyFileFromGitea(Org, App, Commit),
            Times.Once
        );
        _applicationMetadataServiceMock.Verify(service =>
            service.UpdateApplicationMetadataInStorageAsync(
                Org,
                App,
                It.Is<string>(json => json.Contains($"{Org}/{App}")),
                Commit,
                Environment,
                AppStatus.Completed,
                It.IsAny<CancellationToken>()
            )
        );
        _authorizationPolicyServiceMock.Verify(service =>
            service.UpdateApplicationAuthorizationPolicyAsync(
                Org,
                App,
                PolicyFile,
                Environment,
                It.IsAny<CancellationToken>()
            )
        );
    }

    [Fact]
    public async Task UpdateResourceRegistryStatusAsync_ResourceDoesNotExist_ReturnsFailureWithoutPublishing()
    {
        // Arrange
        var resourceRegistry = new Mock<IResourceRegistry>();
        resourceRegistry.Setup(r => r.GetResource(ResourceId, "tt02")).ReturnsAsync((ServiceResource?)null);
        ApplicationInformationService service = CreateService(resourceRegistry);

        // Act
        ResourceRegistryPublishResult result = await service.UpdateResourceRegistryStatusAsync(
            Org,
            App,
            "tt02",
            AppStatus.Deprecated
        );

        // Assert
        Assert.False(result.Succeeded);
        resourceRegistry.Verify(
            r => r.PublishServiceResource(It.IsAny<ServiceResource>(), It.IsAny<string>(), It.IsAny<byte[]>()),
            Times.Never
        );
    }

    private static ApplicationInformationService CreateService(Mock<IResourceRegistry> resourceRegistry) =>
        new(
            Mock.Of<IApplicationMetadataService>(),
            Mock.Of<IAuthorizationPolicyService>(),
            Mock.Of<ITextResourceService>(),
            resourceRegistry.Object,
            Mock.Of<IOrgService>(),
            Mock.Of<IEnvironmentsService>()
        );
}
