using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.OrgInactivityUndeploySettingsController;

public class OrgInactivityUndeploySettingsControllerTests
    : DesignerEndpointsTestsBase<OrgInactivityUndeploySettingsControllerTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string OwnedOrg = "ttd";
    private const string MemberOrg = "skd";
    private const string OtherOrg = "nav";

    private readonly Mock<IOrgSettingsService> _orgSettingsService = new();
    private readonly Mock<IUserOrganizationService> _userOrganizationService = new();
    private readonly Mock<IGiteaClient> _giteaClient = new();

    public OrgInactivityUndeploySettingsControllerTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);

        _userOrganizationService.Setup(s => s.UserIsMemberOfOrganization(OwnedOrg)).ReturnsAsync(true);
        _userOrganizationService.Setup(s => s.UserIsMemberOfOrganization(MemberOrg)).ReturnsAsync(true);
        _giteaClient
            .Setup(c => c.GetTeams())
            .ReturnsAsync(
                new List<Team>
                {
                    new()
                    {
                        Name = "Owners",
                        Organization = new Organization { Username = OwnedOrg },
                    },
                    new()
                    {
                        Name = "Deploy-tt02",
                        Organization = new Organization { Username = MemberOrg },
                    },
                }
            );

        services.AddSingleton(_orgSettingsService.Object);
        services.AddSingleton(_userOrganizationService.Object);
        services.AddSingleton(_giteaClient.Object);
    }

    [Fact]
    public async Task Get_ForMember_ShouldReturnEffectiveSettings()
    {
        _orgSettingsService
            .Setup(s => s.GetInactivityUndeploySettingsAsync(MemberOrg, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new InactivityUndeploySettings(true, 30));

        using var response = await HttpClient.GetAsync(Url(MemberOrg));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(2, CountProperties(json.RootElement));
        Assert.True(json.RootElement.GetProperty("undeployOnInactivity").GetBoolean());
        Assert.Equal(30, json.RootElement.GetProperty("inactivityPeriodDays").GetInt32());
    }

    [Fact]
    public async Task Get_ForNonMember_ShouldReturnForbidden()
    {
        using var response = await HttpClient.GetAsync(Url(OtherOrg));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Theory]
    [InlineData(false, 7)]
    [InlineData(true, 365)]
    public async Task Put_ForOwnerWithValidBody_ShouldSaveAndReturnNoContent(bool undeploy, int periodDays)
    {
        using var response = await HttpClient.PutAsync(
            Url(OwnedOrg),
            Json(
                $$"""{"undeployOnInactivity": {{(undeploy ? "true" : "false")}}, "inactivityPeriodDays": {{periodDays}}}"""
            )
        );

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        _orgSettingsService.Verify(
            s =>
                s.UpsertInactivityUndeploySettingsAsync(
                    It.Is<AltinnOrgEditingContext>(c => c.Org == OwnedOrg && c.Developer == "testUser"),
                    new InactivityUndeploySettings(undeploy, periodDays),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Theory]
    [InlineData("""{"undeployOnInactivity": true, "inactivityPeriodDays": 6}""")]
    [InlineData("""{"undeployOnInactivity": true, "inactivityPeriodDays": 366}""")]
    [InlineData("""{"undeployOnInactivity": true}""")]
    [InlineData("""{"inactivityPeriodDays": 30}""")]
    [InlineData("""{"undeployOnInactivity": true, "inactivityPeriodDays": null}""")]
    public async Task Put_ForOwnerWithInvalidBody_ShouldReturnBadRequest(string body)
    {
        using var response = await HttpClient.PutAsync(Url(OwnedOrg), Json(body));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        VerifyNotSaved();
    }

    [Fact]
    public async Task Put_ForMemberWhoIsNotOwner_ShouldReturnForbidden()
    {
        using var response = await HttpClient.PutAsync(
            Url(MemberOrg),
            Json("""{"undeployOnInactivity": false, "inactivityPeriodDays": 30}""")
        );

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        VerifyNotSaved();
    }

    private void VerifyNotSaved() =>
        _orgSettingsService.Verify(
            s =>
                s.UpsertInactivityUndeploySettingsAsync(
                    It.IsAny<AltinnOrgEditingContext>(),
                    It.IsAny<InactivityUndeploySettings>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );

    private static int CountProperties(JsonElement element)
    {
        var count = 0;
        foreach (var _ in element.EnumerateObject())
        {
            count++;
        }
        return count;
    }

    private static string Url(string org) => $"/designer/api/v1/orgs/{org}/inactivity-undeploy-settings";

    private static StringContent Json(string body) => new(body, Encoding.UTF8, MediaTypeNames.Application.Json);
}
