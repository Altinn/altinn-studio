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

namespace Designer.Tests.Controllers.Admin.AppDailyMetricsController;

public class GetSummaryTests
    : DesignerEndpointsTestsBase<GetSummaryTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string OwnedOrg = "ttd";
    private const string Env = "tt02";

    private readonly Mock<IAppDailyMetricsService> _serviceMock = new();
    private readonly Mock<IGiteaClient> _giteaClientMock = new();

    public GetSummaryTests(WebApplicationFactory<Program> factory)
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
                        Name = $"Admin-{Env}",
                        Organization = new Organization { Username = OwnedOrg },
                    },
                }
            );

        services.AddSingleton(_serviceMock.Object);
        services.AddSingleton(_giteaClientMock.Object);
    }

    [Fact]
    public async Task GetSummary_WhenUserIsOrgOwner_ReturnsSummaryForDefaultPeriod()
    {
        var summary = new AppDailyMetricsSummary
        {
            PeriodDays = 30,
            MetricDate = new DateOnly(2026, 11, 10),
            ObservedSince = new DateOnly(2026, 10, 1),
            ComputedAt = new DateTimeOffset(2026, 11, 11, 2, 30, 0, TimeSpan.Zero),
            Apps =
            [
                new()
                {
                    App = "kpi-a",
                    InstancesCreated = 3,
                    InstancesCreatedPreviousPeriod = 2,
                    InstancesCompleted = 1,
                    SecondsToCompleteP50 = 600,
                    LastInstanceCreatedOn = new DateOnly(2026, 11, 10),
                },
            ],
        };
        _serviceMock
            .Setup(s => s.GetSummaryAsync(OwnedOrg, Env, 30, It.IsAny<CancellationToken>()))
            .ReturnsAsync(summary);

        using var response = await HttpClient.GetAsync($"/designer/api/v1/admin/app-daily-metrics/{OwnedOrg}/{Env}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("2026-11-10", json.GetProperty("metricDate").GetString());
        var app = Assert.Single(json.GetProperty("apps").EnumerateArray());
        Assert.Equal("kpi-a", app.GetProperty("app").GetString());
        Assert.Equal(600, app.GetProperty("secondsToCompleteP50").GetInt32());
        Assert.Equal("2026-11-10", app.GetProperty("lastInstanceCreatedOn").GetString());
    }

    [Fact]
    public async Task GetSummary_WithDays_ShouldPassThePeriod()
    {
        _serviceMock
            .Setup(s => s.GetSummaryAsync(OwnedOrg, Env, 7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AppDailyMetricsSummary { PeriodDays = 7, Apps = [] });

        using var response = await HttpClient.GetAsync(
            $"/designer/api/v1/admin/app-daily-metrics/{OwnedOrg}/{Env}?days=7"
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        _serviceMock.Verify(s => s.GetSummaryAsync(OwnedOrg, Env, 7, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("-1")]
    [InlineData("367")]
    [InlineData("week")]
    public async Task GetSummary_WithInvalidDays_ReturnsBadRequest(string days)
    {
        using var response = await HttpClient.GetAsync(
            $"/designer/api/v1/admin/app-daily-metrics/{OwnedOrg}/{Env}?days={days}"
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        _serviceMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task GetAppDetails_WhenUserIsOrgOwner_ReturnsDetails()
    {
        _serviceMock
            .Setup(s => s.GetAppDetailsAsync(OwnedOrg, Env, "kpi-a", 90, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new AppDailyMetricsDetails
                {
                    PeriodDays = 90,
                    Metrics = new AppDailyMetricsSummaryRow
                    {
                        App = "kpi-a",
                        InstancesCreated = 0,
                        InstancesCreatedPreviousPeriod = 0,
                        InstancesCompleted = 0,
                    },
                }
            );

        using var response = await HttpClient.GetAsync(
            $"/designer/api/v1/admin/app-daily-metrics/{OwnedOrg}/{Env}/kpi-a?days=90"
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("kpi-a", json.GetProperty("metrics").GetProperty("app").GetString());
        Assert.Equal(90, json.GetProperty("periodDays").GetInt32());
    }

    [Theory]
    [InlineData("")]
    [InlineData("/kpi-a")]
    public async Task Get_WhenUserIsNotOrgOwner_ReturnsForbidden(string path)
    {
        using var response = await HttpClient.GetAsync($"/designer/api/v1/admin/app-daily-metrics/someorg/{Env}{path}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        _serviceMock.VerifyNoOtherCalls();
    }
}
