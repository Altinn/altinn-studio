using System.Net;
using System.Net.Http.Json;
using Altinn.Studio.Preview.Sessions;

namespace Altinn.Studio.Preview.Tests;

public sealed class SessionApiTests : IDisposable
{
    private readonly PreviewApplicationFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task StartSession_ReturnsTheUrlThatOpensTheApp()
    {
        _factory.Root.AddWorkingCopy("developer", "ttd", "my-app");

        using HttpResponseMessage response = await Start(_factory.CreateInternalClient(), "developer", "ttd", "my-app");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<StartSessionResponse>(
            TestContext.Current.CancellationToken
        );
        Assert.Matches(
            $"^{PreviewApplicationFactory.PublicBaseUrl}/[0-9a-f]{{32}}/ttd/my-app/$",
            body?.Url.AbsoluteUri ?? string.Empty
        );
    }

    [Fact]
    public async Task StartSession_IsNotServedOnThePublicPort()
    {
        _factory.Root.AddWorkingCopy("developer", "ttd", "my-app");

        using HttpResponseMessage response = await Start(_factory.CreatePublicClient(), "developer", "ttd", "my-app");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Theory]
    [InlineData("..", "ttd", "my-app")]
    [InlineData("developer", "../developer", "my-app")]
    [InlineData("developer", "ttd", "../my-app")]
    [InlineData(null, "ttd", "my-app")]
    public async Task StartSession_RefusesNamesThatAreNotSafe(string? developer, string? org, string? app)
    {
        using HttpResponseMessage response = await Start(_factory.CreateInternalClient(), developer, org, app);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task StartSession_WithoutAWorkingCopy_IsNotFound()
    {
        using HttpResponseMessage response = await Start(_factory.CreateInternalClient(), "developer", "ttd", "my-app");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    internal static Task<HttpResponseMessage> Start(HttpClient client, string? developer, string? org, string? app) =>
        client.PostAsJsonAsync(
            "/sessions",
            new StartSessionRequest(developer, org, app),
            TestContext.Current.CancellationToken
        );
}
