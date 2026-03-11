using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.App.Tests.Fixtures;

/// <summary>
/// Extends the generic engine fixture with AppCommand-specific configuration.
/// Injects <c>AppCommandSettings</c> pointing at WireMock so that AppCommand HTTP callbacks
/// are routed to the in-process mock server.
/// </summary>
public sealed class AppTestFixture : EngineAppFixture<Program>
{
    public const string DefaultInstanceLockToken = "e2e-lock-token-abc123";

    private string AppCommandEndpoint =>
        $"http://localhost:{WireMock.Port}/{{Org}}/{{App}}/instances/{{InstanceOwnerPartyId}}/{{InstanceGuid}}/workflow-engine-callbacks";

    protected override void ConfigureBuilder(WebApplicationBuilder builder)
    {
        builder.Configuration.AddJsonStream(
            $$"""
            {
              "AppCommandSettings": {
                "ApiKey": "{{TestApiKey}}",
                "CommandEndpoint": "{{AppCommandEndpoint}}"
              }
            }
            """.ToJsonStream()
        );
    }
}
