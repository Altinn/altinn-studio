using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Altinn.App.Api.Models;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Api.Tests.Utils;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models.UserAction;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Altinn.App.Api.Tests.Controllers;

public class ActionsControllerTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    public ActionsControllerTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Fact]
    public async Task Perform_returns_403_if_user_not_authorized()
    {
        var org = "tdd";
        var app = "task-action";
        HttpClient client = GetRootedClient(org, app);
        Guid guid = new Guid("b1135209-628e-4a6e-9efd-e4282068ef41");
        TestData.DeleteInstance(org, app, 1337, guid);
        TestData.PrepareInstance(org, app, 1337, guid);
        string token = PrincipalUtil.GetToken(1000, null, 3);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        using HttpResponseMessage response = await client.PostAsync($"/{org}/{app}/instances/1337/{guid}/actions",
            new StringContent("{\"action\":\"lookup_unauthorized\"}", Encoding.UTF8, "application/json"));
        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, guid);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Perform_returns_401_if_user_not_authenticated()
    {
        var org = "tdd";
        var app = "task-action";
        HttpClient client = GetRootedClient(org, app);
        Guid guid = new Guid("b1135209-628e-4a6e-9efd-e4282068ef41");
        TestData.DeleteInstance(org, app, 1337, guid);
        TestData.PrepareInstance(org, app, 1337, guid);
        using HttpResponseMessage response = await client.PostAsync($"/{org}/{app}/instances/1337/{guid}/actions",
            new StringContent("{\"action\":\"lookup_unauthorized\"}", Encoding.UTF8, "application/json"));
        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, guid);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Perform_returns_401_if_userId_is_null()
    {
        var org = "tdd";
        var app = "task-action";
        HttpClient client = GetRootedClient(org, app);
        Guid guid = new Guid("b1135209-628e-4a6e-9efd-e4282068ef41");
        TestData.DeleteInstance(org, app, 1337, guid);
        TestData.PrepareInstance(org, app, 1337, guid);
        string token = PrincipalUtil.GetToken(null, null, 3);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        using HttpResponseMessage response = await client.PostAsync($"/{org}/{app}/instances/1337/{guid}/actions",
            new StringContent("{\"action\":\"lookup_unauthorized\"}", Encoding.UTF8, "application/json"));
        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, guid);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Perform_returns_400_if_action_is_null()
    {
        var org = "tdd";
        var app = "task-action";
        HttpClient client = GetRootedClient(org, app);
        Guid guid = new Guid("b1135209-628e-4a6e-9efd-e4282068ef41");
        TestData.DeleteInstance(org, app, 1337, guid);
        TestData.PrepareInstance(org, app, 1337, guid);
        string token = PrincipalUtil.GetToken(1000, null, 3);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        using HttpResponseMessage response = await client.PostAsync($"/{org}/{app}/instances/1337/{guid}/actions",
            new StringContent("{\"action\":null}", Encoding.UTF8, "application/json"));
        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, guid);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Perform_returns_409_if_process_not_started()
    {
        var org = "tdd";
        var app = "task-action";
        HttpClient client = GetRootedClient(org, app);
        Guid guid = new Guid("b1135209-628e-4a6e-9efd-e4282068ef43");
        TestData.DeleteInstance(org, app, 1337, guid);
        TestData.PrepareInstance(org, app, 1337, guid);
        string token = PrincipalUtil.GetToken(1000, null, 3);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        using HttpResponseMessage response = await client.PostAsync($"/{org}/{app}/instances/1337/{guid}/actions",
            new StringContent("{\"action\":\"lookup\"}", Encoding.UTF8, "application/json"));
        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, guid);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Perform_returns_409_if_process_ended()
    {
        var org = "tdd";
        var app = "task-action";
        HttpClient client = GetRootedClient(org, app);
        Guid guid = new Guid("b1135209-628e-4a6e-9efd-e4282068ef42");
        TestData.DeleteInstance(org, app, 1337, guid);
        TestData.PrepareInstance(org, app, 1337, guid);
        string token = PrincipalUtil.GetToken(1000, null, 3);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        using HttpResponseMessage response = await client.PostAsync($"/{org}/{app}/instances/1337/{guid}/actions",
            new StringContent("{\"action\":\"lookup\"}", Encoding.UTF8, "application/json"));
        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, guid);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Perform_returns_200_if_action_succeeded()
    {
        OverrideServicesForThisTest = (services) => { services.AddTransient<IUserAction, LookupAction>(); };
        var org = "tdd";
        var app = "task-action";
        HttpClient client = GetRootedClient(org, app);
        Guid guid = new Guid("b1135209-628e-4a6e-9efd-e4282068ef41");
        TestData.DeleteInstance(org, app, 1337, guid);
        TestData.PrepareInstance(org, app, 1337, guid);
        string token = PrincipalUtil.GetToken(1000, null, 3);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        using HttpResponseMessage response = await client.PostAsync($"/{org}/{app}/instances/1337/{guid}/actions",
            new StringContent("{\"action\":\"lookup\"}", Encoding.UTF8, "application/json"));
        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, guid);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        var expectedString = """
                             {
                               "updatedDataModels": null,
                               "clientActions": [
                                 {
                                   "id": "nextPage",
                                   "metadata": null
                                 }
                               ],
                               "error": null
                             }
                             """;
        CompareResult<UserActionResponse>(expectedString, content);
    }

    [Fact]
    public async Task Perform_returns_400_if_action_failed()
    {
        OverrideServicesForThisTest = (services) => { services.AddTransient<IUserAction, LookupAction>(); };
        var org = "tdd";
        var app = "task-action";
        HttpClient client = GetRootedClient(org, app);
        Guid guid = new Guid("b1135209-628e-4a6e-9efd-e4282068ef41");
        TestData.DeleteInstance(org, app, 1337, guid);
        TestData.PrepareInstance(org, app, 1337, guid);
        string token = PrincipalUtil.GetToken(1001, null, 3);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        using HttpResponseMessage response = await client.PostAsync($"/{org}/{app}/instances/1337/{guid}/actions",
            new StringContent("{\"action\":\"lookup\"}", Encoding.UTF8, "application/json"));
        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, guid);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Perform_returns_404_if_action_implementation_not_found()
    {
        OverrideServicesForThisTest = (services) => { services.AddTransient<IUserAction, LookupAction>(); };
        var org = "tdd";
        var app = "task-action";
        HttpClient client = GetRootedClient(org, app);
        Guid guid = new Guid("b1135209-628e-4a6e-9efd-e4282068ef41");
        TestData.DeleteInstance(org, app, 1337, guid);
        TestData.PrepareInstance(org, app, 1337, guid);
        string token = PrincipalUtil.GetToken(1001, null, 3);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        using HttpResponseMessage response = await client.PostAsync($"/{org}/{app}/instances/1337/{guid}/actions",
            new StringContent("{\"action\":\"notfound\"}", Encoding.UTF8, "application/json"));
        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, guid);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }


    //TODO: replace this assertion with a proper one once fluentassertions has a json compare feature scheduled for v7 https://github.com/fluentassertions/fluentassertions/issues/2205
    private static void CompareResult<T>(string expectedString, string actualString)
    {
        T? expected = JsonSerializer.Deserialize<T>(expectedString);
        T? actual = JsonSerializer.Deserialize<T>(actualString);
        actual.Should().BeEquivalentTo(expected);
    }
}

public class LookupAction : IUserAction
{
    public string Id => "lookup";

    public async Task<UserActionResult> HandleAction(UserActionContext context)
    {
        await Task.CompletedTask;
        if (context.UserId == 1000)
        {
            return UserActionResult.SuccessResult(new List<ClientAction>() { ClientAction.NextPage() });
        }

        return UserActionResult.FailureResult(new ActionError());
    }
}