using System.Net;
using System.Net.Http.Json;
using WorkflowEngine.Models;

namespace WorkflowEngine.Integration.Tests;

public partial class EngineTests
{
    [Fact]
    public async Task NoApiKey_Returns401()
    {
        // Arrange
        using var unauthenticatedClient = fixture.CreateEngineClient();
        unauthenticatedClient.DefaultRequestHeaders.Remove("X-API-Key");

        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/ping-1")])
        );

        // Act
        using var response = await unauthenticatedClient.PostAsJsonAsync(
            "/api/v1/workflows",
            request,
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        await _testHelpers.AssertDbEmpty();
    }
}
