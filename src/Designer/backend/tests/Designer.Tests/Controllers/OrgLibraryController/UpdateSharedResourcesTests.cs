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
using Designer.Tests.Mocks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.OrgLibraryController;

public class UpdateSharedResourcesTests(WebApplicationFactory<Program> factory) : DesignerEndpointsTestsBase<UpdateSharedResourcesTests>(factory), IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IOrgLibraryService> _orgLibraryServiceMock = new();
    private readonly Mock<IUserOrganizationService> _userOrganizationServiceMock = new();

    private const string Org = "ttd";

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.AddSingleton<IGitea, IGiteaMock>();
        services.AddSingleton(_ => _orgLibraryServiceMock.Object);
        services.AddSingleton(_ => _userOrganizationServiceMock.Object);
    }

    [Fact]
    public async Task UpdateSharedResources_Returns_200Ok_When_Update_Is_Successful()
    {
        // Arrange
        const string Path = "some/path";
        const string BaseCommitSha = "abc123";

        var fileMetadata = new List<FileMetadata>
        {
            new ($"{Path}/file1.txt", "Updated content 1"),
            new ($"{Path}/file2.txt", "Updated content 2")
        };

        string apiUrl = ApiUrl();

        _userOrganizationServiceMock.Setup(s => s.UserIsMemberOfOrganization(Org)).ReturnsAsync(true);

        _orgLibraryServiceMock.Setup(s => s.UpdateSharedResourcesByPath(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<UpdateSharedResourceRequest>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask)
            .Verifiable();

        UpdateSharedResourceRequest updateRequest = new(fileMetadata, BaseCommitSha, "Updating shared resources");

        // Act
        HttpResponseMessage response = await HttpClient.PutAsJsonAsync(apiUrl, updateRequest);

        // Assert
        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
        _orgLibraryServiceMock.Verify(
            s => s.UpdateSharedResourcesByPath(
                "ttd",
                "testUser",
                It.Is<UpdateSharedResourceRequest>(r => r.BaseCommitSha == "abc123" && r.CommitMessage == "Updating shared resources" && r.Files.Count == 2),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateSharedResources_Returns_403Forbidden_When_User_Not_Member_Of_Org()
    {
        // Arrange
        string apiUrl = ApiUrl();

        _userOrganizationServiceMock.Setup(s => s.UserIsMemberOfAnyOrganization()).ReturnsAsync(false);

        UpdateSharedResourceRequest updateRequest = new([], "someCommitSha", "Updating shared resources");

        // Act
        HttpResponseMessage response = await HttpClient.PutAsJsonAsync(apiUrl, updateRequest);

        // Assert
        Assert.Equal(System.Net.HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task UpdateSharedResources_Returns_400BadRequest_When_Service_Throws_InvalidOperationException()
    {
        // Arrange
        string apiUrl = ApiUrl();

        _userOrganizationServiceMock.Setup(s => s.UserIsMemberOfOrganization(Org)).ReturnsAsync(true);

        _orgLibraryServiceMock.Setup(s => s.UpdateSharedResourcesByPath(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<UpdateSharedResourceRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException());

        UpdateSharedResourceRequest updateRequest = new([], "someCommitSha", "Updating shared resources");

        // Act
        HttpResponseMessage response = await HttpClient.PutAsJsonAsync(apiUrl, updateRequest);

        // Assert
        Assert.Equal(System.Net.HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateSharedResources_Returns_400BadRequest_When_Service_Throws_IllegalCommitMessageException()
    {
        // Arrange
        string apiUrl = ApiUrl();

        _userOrganizationServiceMock.Setup(s => s.UserIsMemberOfOrganization(Org)).ReturnsAsync(true);

        _orgLibraryServiceMock.Setup(s => s.UpdateSharedResourcesByPath(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<UpdateSharedResourceRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new IllegalCommitMessageException("Illegal commit message"));

        UpdateSharedResourceRequest updateRequest = new([], "someCommitSha", "some illegal commit message");

        // Act
        HttpResponseMessage response = await HttpClient.PutAsJsonAsync(apiUrl, updateRequest);

        // Assert
        Assert.Equal(System.Net.HttpStatusCode.BadRequest, response.StatusCode);
    }

    private static string ApiUrl() => $"/designer/api/{Org}/shared-resources";
}
