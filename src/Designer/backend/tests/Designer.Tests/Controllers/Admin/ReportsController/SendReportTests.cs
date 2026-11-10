using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Models.ContactPoints;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.Admin.ReportsController;

public class SendReportTests
    : DesignerEndpointsTestsBase<SendReportTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string AdminEnv = "tt02";

    private readonly Mock<IReportService> _reportServiceMock = new();
    private readonly Mock<IGiteaClient> _giteaClientMock = new();

    public SendReportTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);

        _giteaClientMock
            .Setup(c => c.GetTeams())
            .ReturnsAsync(
                new List<Team>
                {
                    new()
                    {
                        Name = $"Admin-{AdminEnv}",
                        Organization = new Organization { Username = Org },
                    },
                }
            );

        _giteaClientMock.Setup(c => c.GetUserOrganizations()).ReturnsAsync([new Organization { Username = Org }]);

        services.AddSingleton(_reportServiceMock.Object);
        services.AddSingleton(_giteaClientMock.Object);
    }

    [Fact]
    public async Task SendReport_WhenUserIsEnvironmentAdmin_SendsTheReport()
    {
        using var response = await HttpClient.PostAsync(ApiUrl(AdminEnv, "weekly"), null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        _reportServiceMock.Verify(
            s => s.SendReportAsync(Org, AdminEnv, ReportFrequency.Weekly, It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task SendReport_WhenOrgMemberIsNotEnvironmentAdmin_ReturnsForbiddenWithoutSending()
    {
        using var response = await HttpClient.PostAsync(ApiUrl("production", "weekly"), null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        _reportServiceMock.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData("none")]
    [InlineData("9")]
    public async Task SendReport_WhenFrequencyIsNotAReportFrequency_ReturnsBadRequestWithoutSending(string frequency)
    {
        using var response = await HttpClient.PostAsync(ApiUrl(AdminEnv, frequency), null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        _reportServiceMock.VerifyNoOtherCalls();
    }

    private static string ApiUrl(string env, string frequency) =>
        $"designer/api/v1/admin/reports/{Org}/{env}/send?frequency={frequency}";
}
