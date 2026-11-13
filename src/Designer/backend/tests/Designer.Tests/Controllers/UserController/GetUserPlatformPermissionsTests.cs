using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.UserController;

public class GetUserPlatformPermissionsTests
    : DesignerEndpointsTestsBase<GetUserPlatformPermissionsTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IStudioPlatformAccessService> _platformAccessMock = new();

    public GetUserPlatformPermissionsTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.AddSingleton(_platformAccessMock.Object);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task GetUserPlatformPermissions_ShouldReportTheServicesAnswer(bool hasAccess)
    {
        _platformAccessMock.Setup(s => s.HasPlatformAccessAsync()).ReturnsAsync(hasAccess);

        using var response = await HttpClient.GetAsync("/designer/api/user/platform-permissions");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(hasAccess, json.GetProperty("hasPlatformAccess").GetBoolean());
    }
}
