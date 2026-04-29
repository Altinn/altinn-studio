using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Fixtures;
using Xunit;

namespace Designer.Tests.StudioOidcGiteaIntegrationTests.BotAccountsController;

public class DeactivateBotAccountStudioOidcTests
    : StudioOidcGiteaIntegrationTestsBase<DeactivateBotAccountStudioOidcTests>
{
    private static readonly JsonSerializerOptions s_jsonOptions = new() { PropertyNameCaseInsensitive = true };

    private const string BaseUrl = "designer/api/v1/orgs/ttd/bot-accounts";

    public DeactivateBotAccountStudioOidcTests(
        StudioOidcGiteaWebAppApplicationFactoryFixture<Program> factory,
        StudioOidcGiteaFixture giteaFixture,
        StudioOidcSharedDesignerHttpClientProvider sharedDesignerHttpClientProvider
    )
        : base(factory, giteaFixture, sharedDesignerHttpClientProvider) { }

    [Fact]
    public async Task Deactivate_ShouldReturnNoContent_AndRemoveFromList()
    {
        using var content = CreateBotAccountRequestContent("deactivate_bot");
        using HttpResponseMessage createResponse = await HttpClient.PostAsync(BaseUrl, content);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        string createBody = await createResponse.Content.ReadAsStringAsync();
        var created = JsonSerializer.Deserialize<CreateBotAccountResponse>(createBody, s_jsonOptions);

        using HttpResponseMessage deactivateResponse = await HttpClient.PostAsync(
            $"{BaseUrl}/{created.Id}/deactivate",
            null
        );

        Assert.Equal(HttpStatusCode.NoContent, deactivateResponse.StatusCode);

        using HttpResponseMessage listResponse = await HttpClient.GetAsync(BaseUrl);
        string listBody = await listResponse.Content.ReadAsStringAsync();
        var bots = JsonSerializer.Deserialize<List<BotAccountResponse>>(listBody, s_jsonOptions);
        Assert.DoesNotContain(bots, b => b.Id == created.Id);
    }

    [Fact]
    public async Task Deactivate_ShouldRemoveBotFromDeployTeamsInGitea()
    {
        using var content = CreateBotAccountRequestContent("deactivate_env_bot", ["TT02", "AT21"]);
        using HttpResponseMessage createResponse = await HttpClient.PostAsync(BaseUrl, content);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        string createBody = await createResponse.Content.ReadAsStringAsync();
        var created = JsonSerializer.Deserialize<CreateBotAccountResponse>(createBody, s_jsonOptions);
        Assert.NotNull(created);

        await AssertBotIsMemberOfTeamAsync("Deploy-TT02", created.Username);
        await AssertBotIsMemberOfTeamAsync("Deploy-AT21", created.Username);

        using HttpResponseMessage deactivateResponse = await HttpClient.PostAsync(
            $"{BaseUrl}/{created.Id}/deactivate",
            null
        );

        Assert.Equal(HttpStatusCode.NoContent, deactivateResponse.StatusCode);

        await AssertBotIsNotMemberOfTeamAsync("Deploy-TT02", created.Username);
        await AssertBotIsNotMemberOfTeamAsync("Deploy-AT21", created.Username);
    }

    private async Task AssertBotIsMemberOfTeamAsync(string teamName, string username)
    {
        JsonArray members = await GetTeamMembersAsync(teamName);
        Assert.Contains(members, member => member["login"]?.GetValue<string>() == username);
    }

    private async Task AssertBotIsNotMemberOfTeamAsync(string teamName, string username)
    {
        JsonArray members = await GetTeamMembersAsync(teamName);
        Assert.DoesNotContain(members, member => member["login"]?.GetValue<string>() == username);
    }

    private async Task<JsonArray> GetTeamMembersAsync(string teamName)
    {
        using HttpResponseMessage teamsResponse = await GiteaFixture.GiteaClient.Value.GetAsync(
            $"orgs/{GiteaConstants.TestOrgUsername}/teams"
        );
        teamsResponse.EnsureSuccessStatusCode();
        string teamsBody = await teamsResponse.Content.ReadAsStringAsync();
        var teams = JsonSerializer.Deserialize<JsonArray>(teamsBody);
        var team = teams.FirstOrDefault(t => t?["name"]?.GetValue<string>() == teamName);
        Assert.NotNull(team);

        long teamId = team["id"]!.GetValue<long>();
        using HttpResponseMessage membersResponse = await GiteaFixture.GiteaClient.Value.GetAsync(
            $"teams/{teamId}/members"
        );
        membersResponse.EnsureSuccessStatusCode();
        string membersBody = await membersResponse.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<JsonArray>(membersBody) ?? [];
    }

    private static StringContent CreateBotAccountRequestContent(string name, string[] deployEnvironments = null)
    {
        string json = JsonSerializer.Serialize(new { name, deployEnvironments });
        return new StringContent(json, Encoding.UTF8, MediaTypeNames.Application.Json);
    }
}
