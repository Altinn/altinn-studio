using System;
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

public class CreateBotAccountStudioOidcTests : StudioOidcGiteaIntegrationTestsBase<CreateBotAccountStudioOidcTests>
{
    private static readonly JsonSerializerOptions s_jsonOptions = new() { PropertyNameCaseInsensitive = true };

    private const string BaseUrl = "designer/api/v1/orgs/ttd/bot-accounts";

    public CreateBotAccountStudioOidcTests(
        StudioOidcGiteaWebAppApplicationFactoryFixture<Program> factory,
        StudioOidcGiteaFixture giteaFixture,
        StudioOidcSharedDesignerHttpClientProvider sharedDesignerHttpClientProvider
    )
        : base(factory, giteaFixture, sharedDesignerHttpClientProvider) { }

    [Fact]
    public async Task Create_ShouldReturnCreatedWithBotAccount()
    {
        using var content = CreateBotAccountRequestContent("deploy_bot");

        using HttpResponseMessage response = await HttpClient.PostAsync(BaseUrl, content);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        string body = await response.Content.ReadAsStringAsync();
        var botAccount = JsonSerializer.Deserialize<CreateBotAccountResponse>(body, s_jsonOptions);
        Assert.NotNull(botAccount);
        Assert.Contains("bot_ttd_deploy_bot", botAccount.Username);
        Assert.Equal("ttd", botAccount.OrganizationName);
        Assert.NotEqual(Guid.Empty, botAccount.Id);
    }

    [Fact]
    public async Task Create_WithEmptyName_ShouldReturnBadRequest()
    {
        using var content = CreateBotAccountRequestContent("");

        using HttpResponseMessage response = await HttpClient.PostAsync(BaseUrl, content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_WithInvalidCharacters_ShouldReturnBadRequest()
    {
        using var content = CreateBotAccountRequestContent("Invalid Name!");

        using HttpResponseMessage response = await HttpClient.PostAsync(BaseUrl, content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_WithDeployEnvironments_ShouldAddBotToTeamInGitea()
    {
        string json = JsonSerializer.Serialize(new { name = "env_bot", deployEnvironments = new[] { "TT02" } });
        using var content = new StringContent(json, Encoding.UTF8, MediaTypeNames.Application.Json);

        using HttpResponseMessage response = await HttpClient.PostAsync(BaseUrl, content);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        string body = await response.Content.ReadAsStringAsync();
        var botAccount = JsonSerializer.Deserialize<CreateBotAccountResponse>(body, s_jsonOptions);

        // Verify the bot was added to Deploy-TT02 team in Gitea
        using HttpResponseMessage teamsResponse = await GiteaFixture.GiteaClient.Value.GetAsync(
            $"orgs/{GiteaConstants.TestOrgUsername}/teams"
        );
        string teamsBody = await teamsResponse.Content.ReadAsStringAsync();
        var teams = JsonSerializer.Deserialize<JsonArray>(teamsBody);
        var deployTeam = teams.FirstOrDefault(t => t["name"]?.GetValue<string>() == "Deploy-TT02");
        Assert.NotNull(deployTeam);

        long teamId = deployTeam["id"].GetValue<long>();
        using HttpResponseMessage membersResponse = await GiteaFixture.GiteaClient.Value.GetAsync(
            $"teams/{teamId}/members"
        );
        string membersBody = await membersResponse.Content.ReadAsStringAsync();
        var members = JsonSerializer.Deserialize<JsonArray>(membersBody);
        Assert.Contains(members, m => m["login"]?.GetValue<string>() == botAccount.Username);
    }

    private static StringContent CreateBotAccountRequestContent(string name)
    {
        string json = JsonSerializer.Serialize(new { name });
        return new StringContent(json, Encoding.UTF8, MediaTypeNames.Application.Json);
    }
}
