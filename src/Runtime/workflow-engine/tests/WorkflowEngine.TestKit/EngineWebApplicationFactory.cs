using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using WorkflowEngine.Core.Extensions;

namespace WorkflowEngine.TestKit;

/// <summary>
/// WebApplicationFactory that runs the real <c>Program.cs</c> entry point from
/// <typeparamref name="TProgram"/>'s assembly and layers test configuration on top.
/// <para>
/// <typeparamref name="TProgram"/> must be a class from the target application assembly
/// (e.g. the implicit <c>Program</c> from top-level statements with <c>public partial class Program;</c>).
/// The factory uses <see cref="ConfigureWebHost"/> to inject test-specific settings
/// (connection strings, API keys, engine settings) without modifying the real application composition.
/// </para>
/// </summary>
public sealed class EngineWebApplicationFactory<TProgram> : WebApplicationFactory<TProgram>
    where TProgram : class
{
    private readonly string _dbConnectionString;
    private readonly Action<IWebHostBuilder>? _configureWebHost;

    public EngineWebApplicationFactory(string dbConnectionString, Action<IWebHostBuilder>? configureWebHost = null)
    {
        _dbConnectionString = dbConnectionString;
        _configureWebHost = configureWebHost;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.ConfigureAppConfiguration(
            (_, config) =>
                config.AddJsonStream(
                    $$"""
                    {
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
                )
        );

        // Override the connection string registered by Program.cs (from appsettings.json)
        // with the test container's connection string.
        builder.ConfigureServices(services =>
        {
            var existing = services.FirstOrDefault(d => d.ServiceType == typeof(EngineConnectionString));
            if (existing != null)
                services.Remove(existing);
            services.AddSingleton(new EngineConnectionString(_dbConnectionString));

            services.AddExceptionHandler<DiagnosticExceptionHandler>();
        });

        _configureWebHost?.Invoke(builder);
    }

    public HttpClient CreateEngineClient()
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Add("X-API-Key", EngineAppFixture.TestApiKey);
        return client;
    }
}
