using System.Net;
using System.Net.Mime;
using Microsoft.AspNetCore.Mvc.Testing;

namespace StudioGateway.Api.Tests;

public class FluxWebhookEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public FluxWebhookEndpointTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Theory]
    [InlineData("TestData/flux-helmrelease-install-succeeded.json")]
    [InlineData("TestData/flux-helmrelease-upgrade-failed.json")]
    [InlineData("TestData/flux-helmrelease-rollback-succeeded.json")]
    [InlineData("TestData/flux-helmrelease-upgrade-succeeded.json")]
    [InlineData("TestData/flux-helmrelease-install-failed.json")]
    [InlineData("TestData/flux-helmrelease-uninstall-succeeded.json")]
    public async Task FluxWebhook_WithValidFluxEvent_ReturnsOk(string testDataFile)
    {
        var jsonContent = await File.ReadAllTextAsync(testDataFile, TestContext.Current.CancellationToken);
        var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, MediaTypeNames.Application.Json);

        var response = await _client.PostAsync("/flux/webhook", content, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
