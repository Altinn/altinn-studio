using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;

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
        builder.ConfigureAppConfiguration(
            (_, config) =>
                config.AddInMemoryCollection(
                    new Dictionary<string, string?>
                    {
                        ["ConnectionStrings:WorkflowEngine"] = _dbConnectionString,
                        ["AppCommandSettings:CommandEndpoint"] = _appCommandEndpoint,
                        ["AppCommandSettings:ApiKey"] = EngineAppFixture.TestApiKey,
                        ["ApiSettings:ApiKeys:0"] = EngineAppFixture.TestApiKey,
                    }
                )
        );

        // Override engine settings for faster test execution via PostConfigure so the
        // values are applied after appsettings binding but before options validation.
        builder.ConfigureServices(services =>
        {
            // Expose full exception details in test responses so failures are diagnosable.
            services.AddExceptionHandler<DiagnosticExceptionHandler>();
        });

        builder.ConfigureServices(services =>
            services
                .AddOptions<EngineSettings>()
                .PostConfigure(opts =>
                {
                    opts.DefaultStepCommandTimeout = TimeSpan.FromSeconds(1);

                    // Fast constant retry so failure tests exhaust quickly.
                    opts.DefaultStepRetryStrategy = RetryStrategy.Constant(
                        interval: TimeSpan.FromMilliseconds(150),
                        maxRetries: 3
                    );

                    // No DB retry delays in tests.
                    opts.DatabaseRetryStrategy = RetryStrategy.Constant(
                        interval: TimeSpan.FromMilliseconds(100),
                        maxRetries: 2
                    );

                    opts.MaxDegreeOfParallelism = 4;
                    opts.QueueCapacity = 100;
                    opts.MaxConcurrentDbOperations = 10;
                    opts.MaxConcurrentHttpCalls = 10;
                })
        );
    }

    public HttpClient CreateEngineClient()
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Add("X-API-Key", EngineAppFixture.TestApiKey);
        return client;
    }
}
