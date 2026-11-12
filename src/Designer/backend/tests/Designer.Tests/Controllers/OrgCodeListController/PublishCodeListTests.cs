using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Organisation;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.OrgCodeListController;

public class PublishCodeListTests(WebApplicationFactory<Program> factory)
    : DesignerEndpointsTestsBase<PublishCodeListTests>(factory),
        IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IOrgCodeListService> _orgCodeListServiceMock = new();
    private readonly Mock<IUserOrganizationService> _userOrganizationServiceMock = new();
    private const string Org = "ttd";

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.AddSingleton(_ => _userOrganizationServiceMock.Object);
        services.AddSingleton(_ => _orgCodeListServiceMock.Object);
    }

    [Fact]
    public async Task PublishCodeList_UserIsMemberOfOrg_ReturnsOk()
    {
        // Arrange
        const string PublishedVersion = "1";
        _userOrganizationServiceMock.Setup(s => s.UserIsMemberOfOrganization(Org)).ReturnsAsync(true);
        _orgCodeListServiceMock
            .Setup(s => s.PublishCodeList(Org, It.IsAny<PublishCodeListRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(PublishedVersion);

        // Act
        using HttpResponseMessage response = await HttpClient.PostAsJsonAsync(ApiUrl, CreateRequest());

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        PublishedVersionResponse body = await response.Content.ReadAsAsync<PublishedVersionResponse>();
        Assert.Equal(PublishedVersion, body.PublishedVersion);
        _userOrganizationServiceMock.VerifyAll();
        _orgCodeListServiceMock.VerifyAll();
    }

    [Fact]
    public async Task PublishCodeList_UserIsMemberOfOtherOrgOnly_ReturnsForbidden()
    {
        // Arrange
        _userOrganizationServiceMock.Setup(s => s.UserIsMemberOfAnyOrganization()).ReturnsAsync(true);
        _userOrganizationServiceMock.Setup(s => s.UserIsMemberOfOrganization(Org)).ReturnsAsync(false);

        // Act
        using HttpResponseMessage response = await HttpClient.PostAsJsonAsync(ApiUrl, CreateRequest());

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        _userOrganizationServiceMock.Verify(s => s.UserIsMemberOfOrganization(Org), Times.Once);
        _orgCodeListServiceMock.Verify(
            s =>
                s.PublishCodeList(
                    It.IsAny<string>(),
                    It.IsAny<PublishCodeListRequest>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    private static PublishCodeListRequest CreateRequest() => new("title", new CodeList(new List<Code>(), null, null));

    private static string ApiUrl => $"/designer/api/{Org}/code-lists/new/publish";
}
