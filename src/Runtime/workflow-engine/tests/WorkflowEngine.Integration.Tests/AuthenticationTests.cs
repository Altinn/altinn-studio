using System.Net;
using WorkflowEngine.Integration.Tests.Fixtures;

namespace WorkflowEngine.Integration.Tests;

[Collection(EngineAppCollection.Name)]
public sealed class AuthenticationTests(EngineAppFixture fixture) : IAsyncLifetime
{
    private static readonly string ProtectedPath = EngineApiClient.GetTenantPath(EngineApiClient.DefaultTenantId);

    public async ValueTask InitializeAsync() => await fixture.ResetAsync();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    [Fact]
    public async Task ValidApiKey_ReturnsSuccess()
    {
        // Arrange
        using var client = fixture.CreateRawClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", EngineAppFixture.TestApiKey);

        // Act
        using var response = await client.GetAsync(ProtectedPath);

        // Assert — 204 No Content is the expected success response for an empty workflow list
        Assert.True(
            response.IsSuccessStatusCode || response.StatusCode == HttpStatusCode.NoContent,
            $"Expected 2xx but got {(int)response.StatusCode}"
        );
    }

    [Fact]
    public async Task InvalidApiKey_Returns403()
    {
        // Arrange
        using var client = fixture.CreateRawClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", "wrong-key");

        // Act
        using var response = await client.GetAsync(ProtectedPath);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task MissingApiKey_Returns401()
    {
        // Arrange
        using var client = fixture.CreateRawClient();

        // Act
        using var response = await client.GetAsync(ProtectedPath);

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task EmptyApiKey_Returns401()
    {
        // Arrange — an empty header value is treated as if the header is absent
        using var client = fixture.CreateRawClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", "");

        // Act
        using var response = await client.GetAsync(ProtectedPath);

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task DashboardEndpoints_DoNotRequireAuth()
    {
        // Arrange
        using var client = fixture.CreateRawClient();

        // Act
        using var response = await client.GetAsync("/dashboard/labels?key=org");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
