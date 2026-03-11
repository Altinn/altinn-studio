using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.TestKit;

// CA1816: call GC.SuppressFinalize(object)
#pragma warning disable CA1816

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// Integration tests that spin up the full ASP.NET Core application (via WebApplicationFactory),
/// POST real JSON payloads to the engine API, and assert on the final workflow state after the
/// engine has processed the requests.
///
/// Infrastructure:
///   • PostgreSQL  – real Testcontainers instance shared across all tests in this class.
///   • WireMock    – in-process HTTP server that acts as the app-callback / webhook receiver.
///   • Engine      – runs as a hosted background service inside the test host.
///
/// Test isolation: every test calls <see cref="EngineAppFixture.ResetAsync"/> to truncate the
/// database and restore WireMock to its default catch-all 200 stub.
/// </summary>
[Collection(EngineAppCollection.Name)]
public partial class EngineTests(EngineAppFixture<Program> fixture) : IAsyncLifetime
{
    private readonly EngineApiClient _client = new(fixture);
    private readonly TestHelpers _testHelpers = new(fixture);

    public async ValueTask InitializeAsync()
    {
        await fixture.ResetAsync();
        await _testHelpers.AssertDbEmpty();
        await Task.Delay(50); // The scheduler may or may not need a cycle breathing room here
    }

    public async ValueTask DisposeAsync()
    {
        _client.Dispose();
        await Task.Delay(50); // The scheduler may or may not need a cycle breathing room here
    }
}
