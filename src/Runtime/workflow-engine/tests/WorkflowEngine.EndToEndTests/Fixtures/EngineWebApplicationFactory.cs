using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace WorkflowEngine.EndToEndTests.Fixtures;

/// <summary>
/// Inner WebApplicationFactory that wires test-specific configuration into
/// the running ASP.NET Core application.
/// </summary>
internal sealed class EngineWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _dbConnectionString;
    private readonly string _appCommandEndpoint;

    public EngineWebApplicationFactory(string dbConnectionString, string appCommandEndpoint)
    {
        _dbConnectionString = dbConnectionString;
        _appCommandEndpoint = appCommandEndpoint;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        // Override some app settings to better fit our test environment
        builder.ConfigureAppConfiguration(
            (_, config) =>
                config.AddJsonStream(
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
                      },
                      "AppCommandSettings": {
                        "ApiKey": "{{EngineAppFixture.TestApiKey}}",
                        "CommandEndpoint":  "{{_appCommandEndpoint}}"
                      }
                    }
                    """.ToJsonStream()
                )
        );

        builder.ConfigureServices(services =>
        {
            // Expose full exception details in test responses so failures are diagnosable.
            services.AddExceptionHandler<DiagnosticExceptionHandler>();
        });
    }

    public HttpClient CreateEngineClient()
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Add("X-API-Key", EngineAppFixture.TestApiKey);
        return client;
    }
}
