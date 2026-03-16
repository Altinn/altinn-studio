using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.App.Tests.Fixtures;

/// <summary>
/// Runs the real <see cref="Program"/> entry point and layers test-specific
/// configuration on top (WireMock callback endpoint for AppCommand).
/// </summary>
public sealed class AppTestFixture : EngineAppFixture<Program>
{
    public const string DefaultInstanceLockToken = "e2e-lock-token-abc123";

    private string AppCommandEndpoint =>
        $"http://localhost:{WireMock.Port}/{{Org}}/{{App}}/instances/{{InstanceOwnerPartyId}}/{{InstanceGuid}}/workflow-engine-callbacks";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration(
            (_, config) =>
                config.AddJsonStream(
                    $$"""
                    {
                      "AppCommandSettings": {
                        "ApiKey": "{{TestApiKey}}",
                        "CommandEndpoint": "{{AppCommandEndpoint}}"
                      }
                    }
                    """.ToJsonStream()
                )
        );
    }
}
