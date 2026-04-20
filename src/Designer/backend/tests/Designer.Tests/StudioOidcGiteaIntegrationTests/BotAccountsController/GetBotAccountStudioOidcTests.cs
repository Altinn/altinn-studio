using System;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Fixtures;
using Xunit;

namespace Designer.Tests.StudioOidcGiteaIntegrationTests.BotAccountsController;

public class GetBotAccountStudioOidcTests : StudioOidcGiteaIntegrationTestsBase<GetBotAccountStudioOidcTests>
{
    private static readonly JsonSerializerOptions s_jsonOptions = new() { PropertyNameCaseInsensitive = true };

    private const string BaseUrl = "designer/api/v1/orgs/ttd/bot-accounts";

    public GetBotAccountStudioOidcTests(
        StudioOidcGiteaWebAppApplicationFactoryFixture<Program> factory,
        StudioOidcGiteaFixture giteaFixture,
        StudioOidcSharedDesignerHttpClientProvider sharedDesignerHttpClientProvider
    )
        : base(factory, giteaFixture, sharedDesignerHttpClientProvider) { }

    [Fact]
    public async Task Get_ShouldReturnBotAccount()
    {
        var botId = await CreateBotAccountAsync("get_bot");

        using HttpResponseMessage response = await HttpClient.GetAsync($"{BaseUrl}/{botId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        string body = await response.Content.ReadAsStringAsync();
        var bot = JsonSerializer.Deserialize<BotAccountResponse>(body, s_jsonOptions);
        Assert.NotNull(bot);
        Assert.Equal(botId, bot.Id);
    }

    private async Task<Guid> CreateBotAccountAsync(string name)
    {
        string json = JsonSerializer.Serialize(new { name });
        using var content = new StringContent(json, Encoding.UTF8, MediaTypeNames.Application.Json);
        using HttpResponseMessage response = await HttpClient.PostAsync(BaseUrl, content);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        string body = await response.Content.ReadAsStringAsync();
        var bot = JsonSerializer.Deserialize<CreateBotAccountResponse>(body, s_jsonOptions);
        return bot.Id;
    }
}
