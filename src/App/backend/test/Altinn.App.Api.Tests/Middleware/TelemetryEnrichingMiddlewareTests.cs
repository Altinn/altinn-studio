using System.Diagnostics;
using System.Net.Http.Headers;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Middleware;

public class TelemetryEnrichingMiddlewareTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    public TelemetryEnrichingMiddlewareTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper) { }

    private (TelemetrySink Telemetry, Func<Task> Request) AnalyzeTelemetry(
        string token,
        bool includeTraceContext = false,
        bool includePdfHeader = false
    )
    {
        this.OverrideServicesForThisTest = (services) =>
        {
            services.AddTelemetrySink(
                additionalActivitySources: source => source.Name == "Microsoft.AspNetCore",
                additionalMeters: source => source.Name == "Microsoft.AspNetCore.Hosting"
            );
        };

        string org = "tdd";
        string app = "contributer-restriction";

        HttpClient client = GetRootedClient(org, app, includeTraceContext);
        var telemetry = this.Services.GetRequiredService<TelemetrySink>();

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);
        if (includePdfHeader)
            client.DefaultRequestHeaders.Add("X-Altinn-IsPdf", "true");

        return (telemetry, async () => await client.GetStringAsync($"/{org}/{app}/api/v1/applicationmetadata"));
    }

    [Fact]
    public async Task Should_Have_Root_AspNetCore_Trace_Org()
    {
        var org = Guid.NewGuid().ToString();
        string token = TestAuthentication.GetServiceOwnerToken();

        var (telemetry, request) = AnalyzeTelemetry(token);
        await request();
        await telemetry.WaitForServerTelemetry();

        var activities = telemetry.CapturedActivities;
        var activity = Assert.Single(activities, a => a.Kind == ActivityKind.Server);
        Assert.True(activity.IsAllDataRequested);
        Assert.True(activity.Recorded);
        Assert.Equal("Microsoft.AspNetCore", activity.Source.Name);
        Assert.Null(activity.Parent);
        Assert.Null(activity.ParentId);
        Assert.Equal(default, activity.ParentSpanId);

        await Verify(telemetry.GetSnapshot());
    }

    [Fact]
    public async Task Should_Have_Root_AspNetCore_Trace_User()
    {
        var partyId = Random.Shared.Next();
        var principal = TestAuthentication.GetUserPrincipal(10, partyId, 4);
        var token = JwtTokenMock.GenerateToken(principal, new TimeSpan(1, 1, 1));

        var (telemetry, request) = AnalyzeTelemetry(token);
        await request();
        await telemetry.WaitForServerTelemetry();

        var activities = telemetry.CapturedActivities;
        var activity = Assert.Single(activities, a => a.Kind == ActivityKind.Server);
        Assert.True(activity.IsAllDataRequested);
        Assert.True(activity.Recorded);
        Assert.Equal("Microsoft.AspNetCore", activity.Source.Name);
        Assert.Null(activity.Parent);
        Assert.Null(activity.ParentId);
        Assert.Equal(default, activity.ParentSpanId);

        await Verify(telemetry.GetSnapshot()).ScrubMember(Telemetry.Labels.UserPartyId);
    }

    [Fact]
    public async Task Should_Always_Be_A_Root_Trace()
    {
        var partyId = Random.Shared.Next();
        var principal = TestAuthentication.GetUserPrincipal(10, partyId, 4);
        var token = JwtTokenMock.GenerateToken(principal, new TimeSpan(1, 1, 1));

        var (telemetry, request) = AnalyzeTelemetry(token, includeTraceContext: true);
        using (var parentActivity = telemetry.Object.ActivitySource.StartActivity("TestParentActivity"))
        {
            Assert.NotNull(parentActivity);
            await request();
        }
        await telemetry.WaitForServerTelemetry();

        var activities = telemetry.CapturedActivities;
        var activity = Assert.Single(activities, a => a.Kind == ActivityKind.Server);
        Assert.True(activity.IsAllDataRequested);
        Assert.True(activity.Recorded);
        Assert.Equal("Microsoft.AspNetCore", activity.Source.Name);
        Assert.Null(activity.Parent);
        Assert.Null(activity.ParentId);
        Assert.Equal(default, activity.ParentSpanId);

        await Verify(telemetry.GetSnapshot()).ScrubMember(Telemetry.Labels.UserPartyId);
    }

    [Fact]
    public async Task Should_Always_Be_A_Root_Trace_Unless_Pdf()
    {
        var partyId = Random.Shared.Next();
        var principal = TestAuthentication.GetUserPrincipal(10, partyId, 4);
        var token = JwtTokenMock.GenerateToken(principal, new TimeSpan(1, 1, 1));

        var (telemetry, request) = AnalyzeTelemetry(token, includeTraceContext: true, includePdfHeader: true);
        ActivitySpanId parentSpanId;
        using (var parentActivity = telemetry.Object.ActivitySource.StartActivity("TestParentActivity"))
        {
            Assert.NotNull(parentActivity);
            parentSpanId = parentActivity.SpanId;
            await request();
        }
        await telemetry.WaitForServerTelemetry();

        var activities = telemetry.CapturedActivities;
        var activity = Assert.Single(activities, a => a.Kind == ActivityKind.Server);
        Assert.True(activity.IsAllDataRequested);
        Assert.True(activity.Recorded);
        Assert.Equal("Microsoft.AspNetCore", activity.Source.Name);
        Assert.NotNull(activity.ParentId);
        Assert.Equal(parentSpanId, activity.ParentSpanId);

        await Verify(telemetry.GetSnapshot()).ScrubMember(Telemetry.Labels.UserPartyId);
    }
}
