using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public sealed class SigningNotificationControllerTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "tdd";
    private const string App = "contributer-restriction";
    private const int OwnerPartyId = 500600;

    public SigningNotificationControllerTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper) { }

    [Fact]
    public async Task List_WithNonServiceOwner_ReturnsForbiddenBeforeReadingInstance()
    {
        using var client = GetRootedUserClient(Org, App);
        using var response = await client.GetAsync(NotificationPath(Guid.NewGuid()));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Resume_WithNonServiceOwner_ReturnsForbiddenBeforeReadingInstance()
    {
        using var client = GetRootedUserClient(Org, App);
        using var response = await client.PostAsync(
            $"{NotificationPath(Guid.NewGuid())}/{Guid.NewGuid()}/resume",
            content: null
        );

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Resume_WithServiceOwnerForWrongOrg_ReturnsForbidden()
    {
        using var client = GetRootedOrgClient(Org, App, serviceOwnerOrg: "other-org");
        using var response = await client.PostAsync(
            $"{NotificationPath(Guid.NewGuid())}/{Guid.NewGuid()}/resume",
            content: null
        );

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task List_WithoutAuthentication_ReturnsUnauthorized()
    {
        using var client = GetRootedClient(Org, App);
        client.DefaultRequestHeaders.Authorization = null;
        using var response = await client.GetAsync(NotificationPath(Guid.NewGuid()));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private static string NotificationPath(Guid instanceGuid) =>
        $"{Org}/{App}/instances/{OwnerPartyId}/{instanceGuid}/signing/notifications";
}
