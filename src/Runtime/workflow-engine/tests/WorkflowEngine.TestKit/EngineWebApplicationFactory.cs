using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace WorkflowEngine.TestKit;

/// <summary>
/// Inner WebApplicationFactory that wires test-specific configuration into the running ASP.NET Core application.
/// <para>
/// Overrides <see cref="CreateHost"/> to build the application directly via
/// <see cref="ITestProgram.CreateBuilder"/> and <see cref="ITestProgram.ConfigureApp"/>,
/// bypassing <see cref="WebApplicationFactory{TEntryPoint}"/>'s entry point discovery.
/// This avoids conflicts with xUnit v3's auto-generated entry point.
/// </para>
/// </summary>
public sealed class EngineWebApplicationFactory<TProgram> : WebApplicationFactory<TProgram>
    where TProgram : class, ITestProgram
{
    private readonly string _dbConnectionString;
    private readonly Action<WebApplicationBuilder>? _configureBuilder;

    public EngineWebApplicationFactory(
        string dbConnectionString,
        Action<WebApplicationBuilder>? configureBuilder = null
    )
    {
        _dbConnectionString = dbConnectionString;
        _configureBuilder = configureBuilder;
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        // Build a "placeholder" test host so that WebApplicationFactory's
        // infrastructure (e.g. resolved services for DI) works correctly.
        // We must build & start it to satisfy the base class contract, but the
        // real app is built below — so dispose the placeholder immediately.
        builder.ConfigureWebHost(wb => wb.UseTestServer());
        var testHost = builder.Build();
        testHost.Start();
        testHost.Dispose();

        // Build the real web application directly, bypassing entry point discovery.
        var appBuilder = TProgram.CreateBuilder([]);
        appBuilder.WebHost.UseTestServer();
        appBuilder.Environment.EnvironmentName = "Development";

        // Apply test-specific configuration overrides
        appBuilder.Configuration.AddJsonStream(
            $$"""
            {
              "ConnectionStrings": {
                  "WorkflowEngine": "{{_dbConnectionString}}"
              },
              "EngineSettings": {
                "QueueCapacity": 100,
                "MaxDegreeOfParallelism": 10,
                "DefaultStepRetryStrategy": {
                  "BackoffType": "Constant",
                  "BaseInterval": "00:00:00.100",
                  "MaxRetries": 3
                },
                "DatabaseRetryStrategy": {
                  "BackoffType": "Constant",
                  "BaseInterval": "00:00:00.100",
                  "MaxRetries": 1
                }
              },
              "ApiSettings": {
                "ApiKeys": [
                  "{{EngineAppFixture.TestApiKey}}"
                ]
              }
            }
            """.ToJsonStream()
        );

        // Allow test-specific builder customization (e.g. registering additional commands)
        _configureBuilder?.Invoke(appBuilder);

        // Expose full exception details in test responses so failures are diagnosable.
        appBuilder.Services.AddExceptionHandler<DiagnosticExceptionHandler>();

        var app = appBuilder.Build();
        TProgram.ConfigureApp(app);
        app.Start();

        return app;
    }

    public HttpClient CreateEngineClient()
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Add("X-API-Key", EngineAppFixture.TestApiKey);
        return client;
    }
}
