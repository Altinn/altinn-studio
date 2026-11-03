using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Testcontainers.PostgreSql;
using WorkflowEngine.Data.Services;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// A database for hosts that each test boots with settings of its own.
/// </summary>
public sealed class DashboardConfigDatabaseFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:18").Build();

    public string ConnectionString => _postgres.GetConnectionString();

    public async ValueTask InitializeAsync()
    {
        await _postgres.StartAsync();
        await new DbMigrationService(NullLogger<DbMigrationService>.Instance).Migrate(ConnectionString);
    }

    public ValueTask DisposeAsync() => _postgres.DisposeAsync();
}

/// <summary>
/// Tests <c>GET /dashboard/config</c>, which reports the host's dashboard settings, so each test boots a host
/// configured for it rather than sharing one.
/// </summary>
public sealed class DashboardConfigEndpointTests(DashboardConfigDatabaseFixture database)
    : IClassFixture<DashboardConfigDatabaseFixture>
{
    private const string TraceUrlTemplateKey = "EngineSettings:Dashboard:TraceUrlTemplate";
    private const string GrafanaUrlKey = "EngineSettings:Dashboard:GrafanaUrl";
    private const string GrafanaTracesDatasourceUidKey = "EngineSettings:Dashboard:GrafanaTracesDatasourceUid";

    private const string AspireTemplate = "http://localhost:18888/traces/detail/{traceId}";

    [Fact]
    public async Task Config_TraceUrlTemplate_ReturnsIt()
    {
        var body = await GetConfig((TraceUrlTemplateKey, AspireTemplate));

        Assert.Equal($$"""{"traceUrlTemplate":"{{AspireTemplate}}"}""", body);
    }

    [Fact]
    public async Task Config_GrafanaPair_ReturnsAGrafanaExploreTemplate()
    {
        var body = await GetConfig(
            (GrafanaUrlKey, "https://grafana.example.com"),
            (GrafanaTracesDatasourceUidKey, "engine-traces")
        );

        Assert.Equal(
            """{"traceUrlTemplate":"https://grafana.example.com/explore?schemaVersion=1\u0026panes=%7B%22trace%22%3A%7B%22datasource%22%3A%22engine-traces%22%2C%22queries%22%3A%5B%7B%22refId%22%3A%22A%22%2C%22datasource%22%3A%7B%22type%22%3A%22tempo%22%2C%22uid%22%3A%22engine-traces%22%7D%2C%22queryType%22%3A%22traceql%22%2C%22query%22%3A%22{traceId}%22%7D%5D%2C%22range%22%3A%7B%22from%22%3A%22now-24h%22%2C%22to%22%3A%22now%22%7D%7D%7D"}""",
            body
        );
    }

    [Fact]
    public async Task Config_TemplateAndGrafanaPair_ReturnsTheTemplate()
    {
        var body = await GetConfig(
            (TraceUrlTemplateKey, AspireTemplate),
            (GrafanaUrlKey, "https://grafana.example.com"),
            (GrafanaTracesDatasourceUidKey, "engine-traces")
        );

        Assert.Equal($$"""{"traceUrlTemplate":"{{AspireTemplate}}"}""", body);
    }

    [Fact]
    public async Task Config_Unconfigured_ReturnsEmptyObject()
    {
        var body = await GetConfig();

        Assert.Equal("{}", body);
    }

    [Theory]
    [InlineData("")]
    [InlineData("  ")]
    public async Task Config_EmptyOrWhitespaceSettings_AreOmittedAsUnset(string value)
    {
        var body = await GetConfig(
            (TraceUrlTemplateKey, value),
            (GrafanaUrlKey, value),
            (GrafanaTracesDatasourceUidKey, value)
        );

        Assert.Equal("{}", body);
    }

    private async Task<string> GetConfig(params (string Key, string Value)[] settings)
    {
        await using var factory = new EngineWebApplicationFactory<Program>(
            database.ConnectionString,
            builder =>
            {
                foreach (var (key, value) in settings)
                    builder.UseSetting(key, value);
            }
        );
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/dashboard/config", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
    }
}
