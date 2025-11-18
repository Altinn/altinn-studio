using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Exceptions.OrgLibrary;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Organisation;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.OrgLibraryController;

public class UpdateSharedResourcesTests(WebApplicationFactory<Program> factory) : DesignerEndpointsTestsBase<UpdateSharedResourcesTests>(factory), IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IOrgLibraryService> _orgLibraryServiceMock = new();
    private readonly Mock<IUserOrganizationService> _userOrganizationServiceMock = new();

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.AddSingleton(_ => _orgLibraryServiceMock.Object);
        services.AddSingleton(_ => _userOrganizationServiceMock.Object);
    }

    [Fact]
    public async Task UpdateSharedResources_Returns_200Ok_When_Update_Is_Successful()
    {
        // Arrange
        string org = "ttd";
        string path = "some/path";
        string apiUrl = $"/designer/api/{org}/shared-resources?path={path}";

        string baseCommitSha = "abc123";

        var fileMetadata = new List<FileMetadata>
        {
            new ($"{path}/file1.txt", "Updated content 1"),
            new ($"{path}/file2.txt", "Updated content 2")
        };

        _userOrganizationServiceMock.Setup(s => s.UserIsMemberOfAnyOrganization()).ReturnsAsync(true);

        _orgLibraryServiceMock.Setup(s => s.UpdateSharedResourcesByPath(org, It.IsAny<string>(), It.IsAny<UpdateSharedResourceRequest>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask)
            .Verifiable();

        var updateRequest = new UpdateSharedResourceRequest(fileMetadata, baseCommitSha, "Updating shared resources");

        // Act
        HttpResponseMessage response = await HttpClient.PutAsJsonAsync(apiUrl, updateRequest);

        // Assert
        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task UpdateSharedResources_Returns_403Forbidden_When_User_Not_Member_Of_Org()
    {
        // Arrange
        string apiUrl = $"/designer/api/ttd/shared-resources?path=some/path";

        _userOrganizationServiceMock.Setup(s => s.UserIsMemberOfAnyOrganization()).ReturnsAsync(false);

        var updateRequest = new UpdateSharedResourceRequest([], "someCommitSha", "Updating shared resources");

        // Act
        HttpResponseMessage response = await HttpClient.PutAsJsonAsync(apiUrl, updateRequest);

        // Assert
        Assert.Equal(System.Net.HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task UpdateSharedResources_Returns_400BadRequest_When_Service_Throws_InvalidOperationException()
    {
        // Arrange
        string apiUrl = $"/designer/api/ttd/shared-resources?path=some/path";

        _userOrganizationServiceMock.Setup(s => s.UserIsMemberOfAnyOrganization()).ReturnsAsync(true);

        _orgLibraryServiceMock.Setup(s => s.UpdateSharedResourcesByPath(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<UpdateSharedResourceRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException());

        var updateRequest = new UpdateSharedResourceRequest([], "someCommitSha", "Updating shared resources");

        // Act
        HttpResponseMessage response = await HttpClient.PutAsJsonAsync(apiUrl, updateRequest);

        // Assert
        Assert.Equal(System.Net.HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateSharedResources_Returns_400BadRequest_When_Service_Throws_IllegalCommitMessageException()
    {
        // Arrange
        string apiUrl = $"/designer/api/ttd/shared-resources?path=some/path";

        _userOrganizationServiceMock.Setup(s => s.UserIsMemberOfAnyOrganization()).ReturnsAsync(true);

        _orgLibraryServiceMock.Setup(s => s.UpdateSharedResourcesByPath(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<UpdateSharedResourceRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new IllegalCommitMessageException("Illegal commit message"));

        var updateRequest = new UpdateSharedResourceRequest([], "someCommitSha", "some illegal commit message");

        // Act
        HttpResponseMessage response = await HttpClient.PutAsJsonAsync(apiUrl, updateRequest);

        // Assert
        Assert.Equal(System.Net.HttpStatusCode.BadRequest, response.StatusCode);
    }
}
