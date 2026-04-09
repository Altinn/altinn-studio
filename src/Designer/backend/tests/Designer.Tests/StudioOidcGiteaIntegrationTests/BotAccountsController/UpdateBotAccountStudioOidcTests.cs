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

public class UpdateBotAccountStudioOidcTests : StudioOidcGiteaIntegrationTestsBase<UpdateBotAccountStudioOidcTests>
{
    private static readonly JsonSerializerOptions s_jsonOptions = new() { PropertyNameCaseInsensitive = true };

    private const string BaseUrl = "designer/api/v1/orgs/ttd/bot-accounts";

    public UpdateBotAccountStudioOidcTests(
        StudioOidcGiteaWebAppApplicationFactoryFixture<Program> factory,
        StudioOidcGiteaFixture giteaFixture,
        StudioOidcSharedDesignerHttpClientProvider sharedDesignerHttpClientProvider
    )
        : base(factory, giteaFixture, sharedDesignerHttpClientProvider) { }

    [Fact]
    public async Task Update_AddDeployEnvironment_ShouldReturnNoContent_AndAddBotToTeamInGitea()
    {
        var created = await CreateBotAccountAsync("update_add_env_bot");

        using var updateContent = CreateUpdateRequestContent(["TT02"]);
        using HttpResponseMessage updateResponse = await HttpClient.PutAsync($"{BaseUrl}/{created.Id}", updateContent);

        Assert.Equal(HttpStatusCode.NoContent, updateResponse.StatusCode);
        await AssertBotIsMemberOfTeamAsync("Deploy-TT02", created.Username);
    }

    [Fact]
    public async Task Update_RemoveDeployEnvironment_ShouldRemoveBotFromTeamInGitea()
    {
        var created = await CreateBotAccountAsync("update_remove_env_bot", deployEnvironments: ["TT02"]);
        await AssertBotIsMemberOfTeamAsync("Deploy-TT02", created.Username);

        using var updateContent = CreateUpdateRequestContent([]);
        using HttpResponseMessage updateResponse = await HttpClient.PutAsync($"{BaseUrl}/{created.Id}", updateContent);

        Assert.Equal(HttpStatusCode.NoContent, updateResponse.StatusCode);
        await AssertBotIsNotMemberOfTeamAsync("Deploy-TT02", created.Username);
    }

    [Fact]
    public async Task Update_AddDeployEnvironment_ShouldBeReflectedInGet()
    {
        var created = await CreateBotAccountAsync("update_get_add_bot");

        using var updateContent = CreateUpdateRequestContent(["TT02"]);
        using HttpResponseMessage updateResponse = await HttpClient.PutAsync($"{BaseUrl}/{created.Id}", updateContent);
        Assert.Equal(HttpStatusCode.NoContent, updateResponse.StatusCode);

        using HttpResponseMessage getResponse = await HttpClient.GetAsync($"{BaseUrl}/{created.Id}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        string body = await getResponse.Content.ReadAsStringAsync();
        var bot = JsonSerializer.Deserialize<BotAccountResponse>(body, s_jsonOptions);
        Assert.Contains("TT02", bot.DeployEnvironments);
    }

    [Fact]
    public async Task Update_RemoveDeployEnvironment_ShouldBeReflectedInGet()
    {
        var created = await CreateBotAccountAsync("update_get_remove_bot", deployEnvironments: ["TT02"]);

        using var updateContent = CreateUpdateRequestContent([]);
        using HttpResponseMessage updateResponse = await HttpClient.PutAsync($"{BaseUrl}/{created.Id}", updateContent);
        Assert.Equal(HttpStatusCode.NoContent, updateResponse.StatusCode);

        using HttpResponseMessage getResponse = await HttpClient.GetAsync($"{BaseUrl}/{created.Id}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        string body = await getResponse.Content.ReadAsStringAsync();
        var bot = JsonSerializer.Deserialize<BotAccountResponse>(body, s_jsonOptions);
        Assert.DoesNotContain("TT02", bot.DeployEnvironments);
    }

    [Fact]
    public async Task Update_WithMissingDeployEnvironments_ShouldReturnBadRequest()
    {
        var created = await CreateBotAccountAsync("update_invalid_bot");

        string json = "{}";
        using var updateContent = new StringContent(json, Encoding.UTF8, MediaTypeNames.Application.Json);
        using HttpResponseMessage updateResponse = await HttpClient.PutAsync($"{BaseUrl}/{created.Id}", updateContent);

        Assert.Equal(HttpStatusCode.BadRequest, updateResponse.StatusCode);
    }

    private async Task<CreateBotAccountResponse> CreateBotAccountAsync(string name, string[] deployEnvironments = null)
    {
        string json = JsonSerializer.Serialize(new { name, deployEnvironments });
        using var content = new StringContent(json, Encoding.UTF8, MediaTypeNames.Application.Json);
        using HttpResponseMessage response = await HttpClient.PostAsync(BaseUrl, content);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        string body = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<CreateBotAccountResponse>(body, s_jsonOptions);
    }

    private static StringContent CreateUpdateRequestContent(string[] deployEnvironments)
    {
        string json = JsonSerializer.Serialize(new { deployEnvironments });
        return new StringContent(json, Encoding.UTF8, MediaTypeNames.Application.Json);
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
}
