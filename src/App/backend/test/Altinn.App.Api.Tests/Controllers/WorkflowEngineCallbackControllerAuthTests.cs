using System.Net;
using System.Text;
using Altinn.App.Api.Infrastructure.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class WorkflowEngineCallbackControllerAuthTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "tdd";
    private const string App = "contributer-restriction";
    private const int InstanceOwnerPartyId = 500600;

    public WorkflowEngineCallbackControllerAuthTests(
        WebApplicationFactory<Program> factory,
        ITestOutputHelper outputHelper
    )
        : base(factory, outputHelper) { }

    private static StringContent EmptyPayload() => new("{}", Encoding.UTF8, "application/json");

    private string GenerateToken(Guid instanceGuid) =>
        Services.GetRequiredService<IWorkflowCallbackTokenGenerator>().GenerateToken(instanceGuid);

    private static string CallbackUrl(Guid instanceGuid) =>
        $"{Org}/{App}/instances/{InstanceOwnerPartyId}/{instanceGuid}/workflow-engine-callbacks/some-command";

    [Fact]
    public async Task Callback_WithoutToken_ReturnsUnauthorized()
    {
        using var client = GetRootedClient(Org, App);
        using var content = EmptyPayload();

        using var response = await client.PostAsync(CallbackUrl(Guid.NewGuid()), content);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Callback_WithValidTokenForInstance_PassesAuthentication()
    {
        var instanceGuid = Guid.NewGuid();
        using var client = GetRootedClient(Org, App);
        client.DefaultRequestHeaders.Add(
            WorkflowEngineCallbackAuthenticationHandler.TokenHeaderName,
            GenerateToken(instanceGuid)
        );
        using var content = EmptyPayload();

        using var response = await client.PostAsync(CallbackUrl(instanceGuid), content);

        // Auth passed; the request may still fail later (e.g. unknown command / invalid body), but not with 401.
        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Callback_WithTokenForDifferentInstance_ReturnsUnauthorized()
    {
        using var client = GetRootedClient(Org, App);
        client.DefaultRequestHeaders.Add(
            WorkflowEngineCallbackAuthenticationHandler.TokenHeaderName,
            GenerateToken(Guid.NewGuid())
        );
        using var content = EmptyPayload();

        // Token's jti is bound to a different instance than the one in the route.
        using var response = await client.PostAsync(CallbackUrl(Guid.NewGuid()), content);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
