using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Tests.Common.Auth;
using Altinn.Platform.Storage.Interface.Models;
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
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
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
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            GenerateToken(Guid.NewGuid())
        );
        using var content = EmptyPayload();

        // Token's jti is bound to a different instance than the one in the route.
        using var response = await client.PostAsync(CallbackUrl(Guid.NewGuid()), content);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Callback_WithStateForDifferentInstance_ReturnsForbidden()
    {
        // The token authenticates for the route instance, but the state blob targets a DIFFERENT instance.
        // The controller must reject this so a token scoped to one instance cannot drive another's state.
        var routeInstanceGuid = Guid.NewGuid();
        var otherInstanceGuid = Guid.NewGuid();

        using var client = GetRootedClient(Org, App);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            GenerateToken(routeInstanceGuid)
        );

        var stateInstance = new Instance
        {
            Id = $"{InstanceOwnerPartyId}/{otherInstanceGuid}",
            AppId = $"{Org}/{App}",
            Org = Org,
            InstanceOwner = new InstanceOwner { PartyId = InstanceOwnerPartyId.ToString() },
            Data = [],
        };
        var payload = new AppCallbackPayload
        {
            CommandKey = MutateProcessState.Key,
            Actor = new Actor { Language = "nb" },
            LockToken = "lock-token",
            WorkflowId = Guid.NewGuid(),
            State = JsonSerializer.Serialize(new WorkflowCallbackState { Instance = stateInstance, FormData = [] }),
        };
        using var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        using var response = await client.PostAsync(
            $"{Org}/{App}/instances/{InstanceOwnerPartyId}/{routeInstanceGuid}/workflow-engine-callbacks/{MutateProcessState.Key}",
            content
        );

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Callback_WithUserToken_ReturnsUnauthorized()
    {
        // A regular end-user JwtCookie token must not be accepted on a callback endpoint: the selector
        // routes callback paths to the callback handler, which only honors workflow callback tokens.
        using var client = GetRootedClient(Org, App);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            TestAuthentication.GetUserToken(userId: 1337, partyId: InstanceOwnerPartyId)
        );
        using var content = EmptyPayload();

        using var response = await client.PostAsync(CallbackUrl(Guid.NewGuid()), content);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // --- Selector fall-through: non-callback requests must still flow through JwtCookie exactly as before. ---

    private const int ProcessPartyId = 500000;
    private static readonly Guid _processInstanceGuid = new("5d9e906b-83ed-44df-85a7-2f104c640bff");

    private static string ProcessUrl(int partyId, Guid instanceGuid) =>
        $"/{Org}/{App}/instances/{partyId}/{instanceGuid}/process";

    [Fact]
    public async Task NonCallbackRequest_WithValidUserToken_StillAuthenticatesViaJwtCookie()
    {
        // The selector must forward non-callback requests to JwtCookie unchanged: a valid user token
        // still authenticates and authorizes the regular (old) execution path.
        using var client = GetRootedUserClient(Org, App, userId: 1337, partyId: ProcessPartyId, authenticationLevel: 3);
        TestData.PrepareInstance(Org, App, ProcessPartyId, _processInstanceGuid);
        try
        {
            using var response = await client.GetAsync(ProcessUrl(ProcessPartyId, _processInstanceGuid));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
        finally
        {
            TestData.DeleteInstanceAndData(Org, App, ProcessPartyId, _processInstanceGuid);
        }
    }

    [Fact]
    public async Task NonCallbackRequest_WithCallbackToken_IsNotAuthenticated()
    {
        // A workflow callback token must not grant access to non-callback endpoints: the selector routes
        // these to JwtCookie, which cannot validate the HMAC callback token, so authentication fails.
        // Use a plain [Authorize] endpoint (no resource policy) so the assertion isolates authentication.
        using var client = GetRootedClient(Org, App);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            GenerateToken(Guid.NewGuid())
        );

        using var response = await client.GetAsync($"{Org}/{App}/api/v1/profile/user");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
