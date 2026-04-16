using System;
using System.Collections.Generic;
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

public class ListBotAccountsStudioOidcTests : StudioOidcGiteaIntegrationTestsBase<ListBotAccountsStudioOidcTests>
{
    private static readonly JsonSerializerOptions s_jsonOptions = new() { PropertyNameCaseInsensitive = true };

    private const string BaseUrl = "designer/api/v1/orgs/ttd/bot-accounts";

    public ListBotAccountsStudioOidcTests(
        StudioOidcGiteaWebAppApplicationFactoryFixture<Program> factory,
        StudioOidcGiteaFixture giteaFixture,
        StudioOidcSharedDesignerHttpClientProvider sharedDesignerHttpClientProvider
    )
        : base(factory, giteaFixture, sharedDesignerHttpClientProvider) { }

    [Fact]
    public async Task List_AfterCreatingBots_ShouldReturnBots()
    {
        using var content = CreateBotAccountRequestContent("list_bot");
        using HttpResponseMessage createResponse = await HttpClient.PostAsync(BaseUrl, content);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        using HttpResponseMessage listResponse = await HttpClient.GetAsync(BaseUrl);

        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        string body = await listResponse.Content.ReadAsStringAsync();
        var bots = JsonSerializer.Deserialize<List<BotAccountResponse>>(body, s_jsonOptions);
        Assert.NotNull(bots);
        Assert.NotEmpty(bots);
    }

    [Fact]
    public async Task List_ShouldIncludeApiKeyCount()
    {
        var botId = await CreateBotAccountAsync("list_bot_with_keys");

        // Create an API key
        using var keyContent = CreateApiKeyRequestContent("test-key", DateTimeOffset.UtcNow.AddDays(30));
        using HttpResponseMessage createKeyResponse = await HttpClient.PostAsync(
            $"{BaseUrl}/{botId}/api-keys",
            keyContent
        );
        Assert.Equal(HttpStatusCode.Created, createKeyResponse.StatusCode);

        // List bots and verify apiKeyCount
        using HttpResponseMessage listResponse = await HttpClient.GetAsync(BaseUrl);
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        string body = await listResponse.Content.ReadAsStringAsync();
        var bots = JsonSerializer.Deserialize<List<BotAccountResponse>>(body, s_jsonOptions);
        Assert.NotNull(bots);
        var createdBot = bots.Find(b => b.Id == botId);
        Assert.NotNull(createdBot);
        Assert.Equal(1, createdBot.ApiKeyCount);
    }

    private async Task<Guid> CreateBotAccountAsync(string name)
    {
        string json = JsonSerializer.Serialize(new { name });
        using var content = new StringContent(json, Encoding.UTF8, MediaTypeNames.Application.Json);
        using HttpResponseMessage response = await HttpClient.PostAsync(BaseUrl, content);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        string body = await response.Content.ReadAsStringAsync();
        var bot = JsonSerializer.Deserialize<BotAccountResponse>(body, s_jsonOptions);
        return bot.Id;
    }

    private static StringContent CreateApiKeyRequestContent(string name, DateTimeOffset expiresAt)
    {
        string json = JsonSerializer.Serialize(new { name, expiresAt });
        return new StringContent(json, Encoding.UTF8, MediaTypeNames.Application.Json);
    }

    private static StringContent CreateBotAccountRequestContent(string name, string[] deployEnvironments = null)
    {
        string json = JsonSerializer.Serialize(new { name, deployEnvironments });
        return new StringContent(json, Encoding.UTF8, MediaTypeNames.Application.Json);
    }
}
