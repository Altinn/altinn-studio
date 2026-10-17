using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models.AppSettings;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.AppSettingsController;

public class AppSettingsControllerTests
    : DesignerEndpointsTestsBase<AppSettingsControllerTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string App = "app1";
    private const string Url = $"/designer/api/v1/{Org}/{App}/app-settings";

    private readonly Mock<IAppSettingsService> _appSettingsService = new();
    private readonly Mock<IOrgSettingsService> _orgSettingsService = new();
    private readonly Mock<IUserOrganizationService> _userOrganizationService = new();

    public AppSettingsControllerTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);

        _userOrganizationService.Setup(s => s.UserIsMemberOfOrganization(Org)).ReturnsAsync(true);
        _orgSettingsService
            .Setup(s => s.GetInactivityUndeploySettingsAsync(Org, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new InactivityUndeploySettings(false, 60));

        services.AddSingleton(_appSettingsService.Object);
        services.AddSingleton(_orgSettingsService.Object);
        services.AddSingleton(_userOrganizationService.Object);
    }

    [Fact]
    public async Task Get_WithoutAppSettings_ShouldReturnNullsAndTheOrgSettings()
    {
        using var response = await HttpClient.GetAsync(Url);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(
            ["undeployOnInactivity", "inactivityPeriodDays", "orgUndeployOnInactivity", "orgInactivityPeriodDays"],
            json.RootElement.EnumerateObject().Select(p => p.Name)
        );
        Assert.Equal(JsonValueKind.Null, json.RootElement.GetProperty("undeployOnInactivity").ValueKind);
        Assert.Equal(JsonValueKind.Null, json.RootElement.GetProperty("inactivityPeriodDays").ValueKind);
        Assert.False(json.RootElement.GetProperty("orgUndeployOnInactivity").GetBoolean());
        Assert.Equal(60, json.RootElement.GetProperty("orgInactivityPeriodDays").GetInt32());
    }

    [Fact]
    public async Task Get_WithAppSettings_ShouldReturnTheAppValues()
    {
        _appSettingsService
            .Setup(s => s.GetAsync(It.Is<AltinnRepoContext>(c => c.Repo == App), null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new AppSettingsEntity
                {
                    Org = Org,
                    App = App,
                    UndeployOnInactivity = true,
                    InactivityPeriodDays = 14,
                }
            );

        using var response = await HttpClient.GetAsync(Url);

        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.True(json.RootElement.GetProperty("undeployOnInactivity").GetBoolean());
        Assert.Equal(14, json.RootElement.GetProperty("inactivityPeriodDays").GetInt32());
    }

    [Theory]
    [InlineData("""{"undeployOnInactivity": null, "inactivityPeriodDays": null}""", null, null)]
    [InlineData("""{}""", null, null)]
    [InlineData("""{"undeployOnInactivity": false, "inactivityPeriodDays": 7}""", false, 7)]
    [InlineData("""{"undeployOnInactivity": true, "inactivityPeriodDays": 365}""", true, 365)]
    public async Task Put_WithValidBody_ShouldSaveAndReturnNoContent(
        string body,
        bool? expectedUndeployOnInactivity,
        int? expectedInactivityPeriodDays
    )
    {
        using var response = await HttpClient.PutAsync(Url, Json(body));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        _appSettingsService.Verify(
            s =>
                s.UpsertAsync(
                    It.Is<AltinnRepoEditingContext>(c => c.Org == Org && c.Repo == App),
                    expectedUndeployOnInactivity,
                    expectedInactivityPeriodDays,
                    null,
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Theory]
    [InlineData("""{"undeployOnInactivity": true, "inactivityPeriodDays": 6}""")]
    [InlineData("""{"undeployOnInactivity": null, "inactivityPeriodDays": 366}""")]
    public async Task Put_WithPeriodOutOfRange_ShouldReturnBadRequest(string body)
    {
        using var response = await HttpClient.PutAsync(Url, Json(body));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        _appSettingsService.Verify(
            s =>
                s.UpsertAsync(
                    It.IsAny<AltinnRepoEditingContext>(),
                    It.IsAny<bool?>(),
                    It.IsAny<int?>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    private static StringContent Json(string body) => new(body, Encoding.UTF8, MediaTypeNames.Application.Json);
}
