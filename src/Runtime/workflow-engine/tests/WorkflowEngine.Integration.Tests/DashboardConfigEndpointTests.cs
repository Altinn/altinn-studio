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
    private const string GrafanaUrlKey = "EngineSettings:Dashboard:GrafanaUrl";
    private const string GrafanaTracesDatasourceUidKey = "EngineSettings:Dashboard:GrafanaTracesDatasourceUid";

    [Fact]
    public async Task Config_GrafanaConfigured_ReturnsBothSettings()
    {
        var body = await GetConfig(
            (GrafanaUrlKey, "https://grafana.example.com"),
            (GrafanaTracesDatasourceUidKey, "engine-traces")
        );

        Assert.Equal(
            """{"grafanaUrl":"https://grafana.example.com","grafanaTracesDatasourceUid":"engine-traces"}""",
            body
        );
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
        var body = await GetConfig((GrafanaUrlKey, value), (GrafanaTracesDatasourceUidKey, value));

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
