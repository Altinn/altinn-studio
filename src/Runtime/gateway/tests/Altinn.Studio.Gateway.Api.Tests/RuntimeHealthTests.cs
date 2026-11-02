using System.Net;
using Altinn.Studio.Gateway.Api.Health;
using Altinn.Studio.Gateway.Api.Settings;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;

namespace Altinn.Studio.Gateway.Api.Tests;

/// <summary>
/// The public health endpoint, which the platform team's uptime monitoring probes, and the runtime checks behind it.
/// </summary>
public sealed class RuntimeHealthTests : IDisposable
{
    private static readonly Uri _healthEndpoint = new("/runtime/gateway/api/v1/health", UriKind.Relative);

    private readonly GatewayApiFactory _gateway = new();
    private readonly WebApplicationFactory<Program> _factory;

    public RuntimeHealthTests()
    {
        _factory = _gateway.WithWebHostBuilder(builder =>
            builder.ConfigureTestServices(services =>
            {
                // The tests publish their own reports, so the background run must not replace them.
                services.PostConfigure<HealthCheckPublisherOptions>(options => options.Delay = TimeSpan.FromDays(1));
                services
                    .AddHealthChecks()
                    .AddCheck(
                        "failing-dependency",
                        () => HealthCheckResult.Unhealthy(),
                        tags: [RuntimeHealthRegistration.RuntimeTag]
                    );
            })
        );
    }

    public void Dispose()
    {
        _factory.Dispose();
        _gateway.Dispose();
    }

    [Fact]
    public async Task Health_AnswersTheLatestReportWithoutAuthentication()
    {
        var ct = TestContext.Current.CancellationToken;
        await Publish(
            HealthStatus.Healthy,
            new HealthReportEntry(
                HealthStatus.Healthy,
                "up",
                TimeSpan.FromMilliseconds(7),
                exception: null,
                data: null,
                tags: [RuntimeHealthRegistration.RuntimeTag]
            )
        );
        using var client = _factory.CreateClient();

        using var response = await client.GetAsync(_healthEndpoint, ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(HealthReportWriter.ContentType, response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(
            """{"status":"healthy","totalDuration":"00:00:00.0070000","entries":{"pdf3":{"status":"healthy","duration":"00:00:00.0070000"}}}""",
            await response.Content.ReadAsStringAsync(ct)
        );
    }

    [Fact]
    public async Task Health_WhenUnhealthy_Answers503WithoutTheCheckDetails()
    {
        var ct = TestContext.Current.CancellationToken;
        await Publish(
            HealthStatus.Unhealthy,
            new HealthReportEntry(
                HealthStatus.Unhealthy,
                "internal.example:8080 refused the connection",
                TimeSpan.FromSeconds(3),
                new HttpRequestException("internal.example:8080 refused the connection"),
                data: null
            )
        );
        using var client = _factory.CreateClient();

        using var response = await client.GetAsync(_healthEndpoint, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.StartsWith("""{"status":"unhealthy",""", body, StringComparison.Ordinal);
        Assert.DoesNotContain("internal.example", body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task KubeletProbes_DontRunTheRuntimeChecks()
    {
        var ct = TestContext.Current.CancellationToken;
        using var client = _factory.CreateClient();

        using var liveBefore = await client.GetAsync(new Uri("/health/live", UriKind.Relative), ct);
        using var readyBefore = await client.GetAsync(new Uri("/health/ready", UriKind.Relative), ct);
        await Publish(HealthStatus.Unhealthy);
        using var readyAfter = await client.GetAsync(new Uri("/health/ready", UriKind.Relative), ct);

        Assert.Equal(HttpStatusCode.OK, liveBefore.StatusCode);
        // Not ready until the runtime checks have run once, whatever their result.
        Assert.Equal(HttpStatusCode.ServiceUnavailable, readyBefore.StatusCode);
        Assert.Equal(HttpStatusCode.OK, readyAfter.StatusCode);
    }

    [Fact]
    public async Task Publisher_ReportsACheckThatTimesOutAsUnhealthy()
    {
        var ct = TestContext.Current.CancellationToken;
        using var gateway = new GatewayApiFactory();
        using var factory = gateway.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration(
                (_, configuration) =>
                    configuration.AddInMemoryCollection(
                        new Dictionary<string, string?> { ["RuntimeHealth:Timeout"] = "00:00:00.200" }
                    )
            );
            builder.ConfigureTestServices(services =>
                services
                    .AddHealthChecks()
                    .AddAsyncCheck(
                        "stalled-dependency",
                        async cancellationToken =>
                        {
                            await Task.Delay(Timeout.InfiniteTimeSpan, cancellationToken);
                            return HealthCheckResult.Healthy();
                        },
                        tags: [RuntimeHealthRegistration.RuntimeTag]
                    )
            );
        });
        using var client = factory.CreateClient();
        var report = factory.Services.GetRequiredService<RuntimeHealthReport>();

        // The publisher's first run starts a second after startup.
        var deadline = DateTimeOffset.UtcNow.AddSeconds(10);
        while (!report.HasRun && DateTimeOffset.UtcNow < deadline)
        {
            await Task.Delay(50, ct);
        }
        using var ready = await client.GetAsync(new Uri("/health/ready", UriKind.Relative), ct);
        using var health = await client.GetAsync(_healthEndpoint, ct);

        Assert.True(report.HasRun);
        Assert.Equal(HealthStatus.Unhealthy, report.Current.Entries["stalled-dependency"].Status);
        Assert.Equal(HttpStatusCode.OK, ready.StatusCode);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, health.StatusCode);
    }

    [Fact]
    public void Report_IsUnhealthyBeforeTheChecksHaveRun()
    {
        var report = CreateReport(new FakeTimeProvider());

        Assert.False(report.HasRun);
        Assert.Equal(HealthStatus.Unhealthy, report.Current.Status);
    }

    [Fact]
    public async Task Report_IsUnhealthyWhenTheChecksHaveStoppedRunning()
    {
        var time = new FakeTimeProvider();
        var report = CreateReport(time);
        await report.PublishAsync(Report(HealthStatus.Healthy), TestContext.Current.CancellationToken);

        time.Advance(TimeSpan.FromSeconds(90));
        var current = report.Current.Status;
        time.Advance(TimeSpan.FromSeconds(1));
        var stale = report.Current.Status;

        Assert.Equal(HealthStatus.Healthy, current);
        Assert.Equal(HealthStatus.Unhealthy, stale);
    }

    [Theory]
    [InlineData(HttpStatusCode.OK, HealthStatus.Healthy)]
    // What Linkerd answers when the route is gone: the Service behind the address has no endpoints.
    [InlineData(HttpStatusCode.GatewayTimeout, HealthStatus.Unhealthy)]
    // What an older relay answers, before it had the health endpoint.
    [InlineData(HttpStatusCode.NotFound, HealthStatus.Unhealthy)]
    public async Task Pdf3Check_CallsTheAddressAppsCall(HttpStatusCode answer, HealthStatus expected)
    {
        using var handler = new FakeWorkflowEngineHandler { ResponseFactory = _ => new HttpResponseMessage(answer) };
        var services = new ServiceCollection();
        services.AddHttpClient(Pdf3HealthCheck.HttpClientName).ConfigurePrimaryHttpMessageHandler(() => handler);
        using var provider = services.BuildServiceProvider();
        var settings = new RuntimeHealthSettings();
        var check = new Pdf3HealthCheck(provider.GetRequiredService<IHttpClientFactory>(), Options.Create(settings));

        var result = await check.CheckHealthAsync(new HealthCheckContext(), TestContext.Current.CancellationToken);

        Assert.Equal(expected, result.Status);
        var request = Assert.Single(handler.Requests);
        Assert.Equal(new Uri("http://pdf-generator.pdf.svc.cluster.local/pdf/health"), request.Uri);
    }

    [Theory]
    [InlineData(null, true)]
    [InlineData("false", false)]
    public void Pdf3Check_IsARuntimeCheckUnlessTurnedOff(string? checkPdf3, bool registered)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["RuntimeHealth:CheckPdf3"] = checkPdf3 })
            .Build();
        var services = new ServiceCollection();

        services.AddRuntimeHealth(configuration);
        using var provider = services.BuildServiceProvider();
        var registrations = provider.GetRequiredService<IOptions<HealthCheckServiceOptions>>().Value.Registrations;

        var pdf3 = registrations.SingleOrDefault(registration => registration.Name == Pdf3HealthCheck.Name);
        Assert.Equal(registered, pdf3 is not null);
        if (pdf3 is not null)
        {
            Assert.Contains(RuntimeHealthRegistration.RuntimeTag, pdf3.Tags);
        }
    }

    private Task Publish(HealthStatus status, HealthReportEntry? pdf3 = null) =>
        _factory
            .Services.GetRequiredService<RuntimeHealthReport>()
            .PublishAsync(Report(status, pdf3), TestContext.Current.CancellationToken);

    private static HealthReport Report(HealthStatus status, HealthReportEntry? pdf3 = null) =>
        new(
            pdf3 is { } entry
                ? new Dictionary<string, HealthReportEntry> { [Pdf3HealthCheck.Name] = entry }
                : new Dictionary<string, HealthReportEntry>(),
            status,
            pdf3?.Duration ?? TimeSpan.Zero
        );

    private static RuntimeHealthReport CreateReport(TimeProvider time) =>
        new(time, Options.Create(new RuntimeHealthSettings()));
}
