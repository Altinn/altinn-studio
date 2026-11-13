using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Models.Metrics;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.Platform;

public class PlatformMetricsControllerTests
    : DesignerEndpointsTestsBase<PlatformMetricsControllerTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Url = "/designer/api/v1/platform/app-daily-metrics";

    private readonly Mock<IPlatformMetricsService> _serviceMock = new();
    private readonly Mock<IGiteaClient> _giteaClientMock = new();

    public PlatformMetricsControllerTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        GrantTeam("Studio-Platform");
        services.AddSingleton(_serviceMock.Object);
        services.AddSingleton(_giteaClientMock.Object);
    }

    [Fact]
    public async Task GetAppDailyMetrics_WhenUserIsInThePlatformTeam_ReturnsMetricsForTheEnvironment()
    {
        _serviceMock
            .Setup(s => s.GetAppDailyMetricsAsync("production", 30, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new PlatformAppDailyMetrics
                {
                    Environment = "production",
                    PeriodDays = 30,
                    MetricDate = new DateOnly(2026, 11, 10),
                    ServiceOwners =
                    [
                        new()
                        {
                            Org = "skd",
                            ObservedSince = new DateOnly(2026, 10, 1),
                            LatestMetricDate = new DateOnly(2026, 11, 10),
                            ComputedAt = new DateTimeOffset(2026, 11, 11, 2, 30, 0, TimeSpan.Zero),
                            Apps =
                            [
                                new()
                                {
                                    App = "mva",
                                    InstancesCreated = 1,
                                    InstancesCreatedPreviousPeriod = 0,
                                    InstancesCompleted = 0,
                                },
                            ],
                        },
                    ],
                }
            );

        using var response = await HttpClient.GetAsync($"{Url}?env=production");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("2026-11-10", json.GetProperty("metricDate").GetString());
        var owner = Assert.Single(json.GetProperty("serviceOwners").EnumerateArray());
        Assert.Equal("skd", owner.GetProperty("org").GetString());
        Assert.Equal(
            1,
            Assert.Single(owner.GetProperty("apps").EnumerateArray()).GetProperty("instancesCreated").GetInt32()
        );
    }

    [Fact]
    public async Task GetAppDailyMetrics_WithDays_ShouldPassThePeriod()
    {
        _serviceMock
            .Setup(s => s.GetAppDailyMetricsAsync("tt02", 90, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new PlatformAppDailyMetrics
                {
                    Environment = "tt02",
                    PeriodDays = 90,
                    ServiceOwners = [],
                }
            );

        using var response = await HttpClient.GetAsync($"{Url}?env=tt02&days=90");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        _serviceMock.Verify(s => s.GetAppDailyMetricsAsync("tt02", 90, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData("")]
    [InlineData("?env=")]
    [InlineData("?env=not%20an%20env")]
    [InlineData("?env=tt02&days=0")]
    [InlineData("?env=tt02&days=367")]
    public async Task GetAppDailyMetrics_WithInvalidQuery_ReturnsBadRequest(string query)
    {
        using var response = await HttpClient.GetAsync($"{Url}{query}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        _serviceMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task GetAppDailyMetrics_WhenUserIsNotInThePlatformTeam_ReturnsForbidden()
    {
        _ = HttpClient;
        GrantTeam("Admin-TT02");

        using var response = await HttpClient.GetAsync($"{Url}?env=production");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        _serviceMock.VerifyNoOtherCalls();
    }

    private void GrantTeam(string team)
    {
        _giteaClientMock
            .Setup(c => c.GetTeams())
            .ReturnsAsync(
                new List<Team>
                {
                    new()
                    {
                        Name = team,
                        Organization = new Organization { Username = "ttd" },
                    },
                }
            );
    }
}
