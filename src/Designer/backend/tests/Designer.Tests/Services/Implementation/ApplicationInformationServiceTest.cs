#nullable enable
using System.Threading;
using System.Threading.Tasks;
using Altinn.ResourceRegistry.Core.Models;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace Designer.Tests.Services.Implementation;

public class ApplicationInformationServiceTest
{
    private const string Org = "digdir";
    private const string App = "some-app";
    private const string Commit = "abcd1234";
    private const string Environment = "tt02";
    private const string PolicyFile = "<Policy>[ORG]/[APP]</Policy>";

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

    [Fact]
    public async Task UpdateAndPublish_ForOneDeploy_ReadEachFileFromGiteaOnce()
    {
        await _service.UpdateApplicationMetadataAndPoliciesAsync(Org, App, Commit, Environment);
        ResourceRegistryPublishResult result = await _service.PublishToResourceRegistryAsync(
            Org,
            App,
            Commit,
            Environment
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
}
