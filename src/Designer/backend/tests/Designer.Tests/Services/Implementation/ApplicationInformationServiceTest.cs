#nullable enable
using System.Threading.Tasks;
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
    private const string ResourceId = "app_ttd_test-app";

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
