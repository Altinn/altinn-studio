using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Operator.Tests.Fixtures;

/// <summary>
/// Runs the real <see cref="Program"/> entry point against PostgreSQL in a container, with WireMock in the role of
/// the core operator's callback router.
/// </summary>
public sealed class OperatorTestFixture : EngineAppFixture<Program>
{
    public const string CallbackPath = "/workflow-engine-callbacks/";
    public const string Token = "integration-token";

    private readonly string _tokenFile = WriteTokenFile();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        var commandEndpoint = $"http://localhost:{WireMock.Port}{CallbackPath}";
        builder.ConfigureAppConfiguration(
            (_, config) =>
                config.AddJsonStream(
                    $$"""
                    {
                      "OperatorCommandSettings": {
                        "CommandEndpoint": "{{commandEndpoint}}",
                        "TokenPath": "{{_tokenFile}}"
                      }
                    }
                    """.ToJsonStream()
                )
        );
    }

    // In the build output, so it needs no cleanup.
    private static string WriteTokenFile()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "operator-token");
        File.WriteAllText(path, Token);
        return path;
    }
}
