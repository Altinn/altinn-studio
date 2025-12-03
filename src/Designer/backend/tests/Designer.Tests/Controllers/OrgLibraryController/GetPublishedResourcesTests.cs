using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Exceptions.SharedContent;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;
using Xunit.Abstractions;

namespace Designer.Tests.Controllers.OrgLibraryController;

public class GetPublishedResourcesTests(WebApplicationFactory<Program> factory, ITestOutputHelper output)
    : DesignerEndpointsTestsBase<GetPublishedResourcesTests>(factory), IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<ISharedContentClient> _sharedContentClientMock = new();
    private readonly Mock<IUserOrganizationService> _userOrganizationServiceMock = new();

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.AddSingleton(_ => _sharedContentClientMock.Object);
        services.AddSingleton(_ => _userOrganizationServiceMock.Object);
    }

    [Fact]
    public async Task GetPublishedResources_WithPath()
    {
        // Arrange
        string orgName = "ttd";
        string path = "some/path";
        List<string> names = ["blob1", "blob2", "blob3"];
        string url = $"/designer/api/{orgName}/shared-resources/published?path={path}";

        SetupOrg(orgName);

        _sharedContentClientMock
            .Setup(c => c.GetPublishedResourcesForOrg(orgName, path, It.IsAny<CancellationToken>()))
            .ReturnsAsync(names);

        // Act
        HttpResponseMessage response = await HttpClient.GetAsync(url);

        // Assert
        if (!response.IsSuccessStatusCode)
        {
            string content = await response.Content.ReadAsStringAsync();
            output.WriteLine($"Response content: {content}");
        }
        response.EnsureSuccessStatusCode();
        List<string> result = await response.Content.ReadFromJsonAsync<List<string>>();
        Assert.Equal(names, result);
    }

    [Fact]
    public async Task GetPublishedResources_WithoutPath()
    {
        // Arrange
        string orgName = "ttd";
        List<string> names = ["blob1", "blob2"];
        string url = $"/designer/api/{orgName}/shared-resources/published";

        SetupOrg(orgName);

        _sharedContentClientMock
            .Setup(c => c.GetPublishedResourcesForOrg(orgName, "", It.IsAny<CancellationToken>()))
            .ReturnsAsync(names);

        // Act
        HttpResponseMessage response = await HttpClient.GetAsync(url);

        // Assert
        if (!response.IsSuccessStatusCode)
        {
            string content = await response.Content.ReadAsStringAsync();
            output.WriteLine($"Response content: {content}");
        }
        response.EnsureSuccessStatusCode();
        List<string> result = await response.Content.ReadFromJsonAsync<List<string>>();
        Assert.Equal(names, result);
    }

    [Fact]
    public async Task GetPublishedResources_SharedContentRequestException()
    {
        // Arrange
        string orgName = "ttd";
        string url = $"/designer/api/{orgName}/shared-resources/published";
        string errorMessage = "Lorem ipsum dolor sit amet";

        SetupOrg(orgName);

        _sharedContentClientMock
            .Setup(c => c.GetPublishedResourcesForOrg(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Throws(new SharedContentRequestException(errorMessage));

        // Act
        HttpResponseMessage response = await HttpClient.GetAsync(url);

        // Assert
        if (!response.IsSuccessStatusCode)
        {
            string content = await response.Content.ReadAsStringAsync();
            output.WriteLine($"Response content: {content}");
        }
        Assert.Equal(System.Net.HttpStatusCode.BadRequest, response.StatusCode);
        ProblemDetails result = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal(errorMessage, result.Detail);
    }

    private void SetupOrg(string orgName)
    {
        _userOrganizationServiceMock
            .Setup(s => s.UserIsMemberOfOrganization(orgName))
            .ReturnsAsync(true)
            .Verifiable();
    }
}
