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

public class BotAccountApiKeysStudioOidcTests : StudioOidcGiteaIntegrationTestsBase<BotAccountApiKeysStudioOidcTests>
{
    private static readonly JsonSerializerOptions s_jsonOptions = new() { PropertyNameCaseInsensitive = true };

    private const string BaseUrl = "designer/api/v1/orgs/ttd/bot-accounts";

    public BotAccountApiKeysStudioOidcTests(
        StudioOidcGiteaWebAppApplicationFactoryFixture<Program> factory,
        StudioOidcGiteaFixture giteaFixture,
        StudioOidcSharedDesignerHttpClientProvider sharedDesignerHttpClientProvider
    )
        : base(factory, giteaFixture, sharedDesignerHttpClientProvider) { }

    [Fact]
    public async Task CreateApiKey_ShouldReturnCreatedWithKey()
    {
        var botId = await CreateBotAccountAsync("apikey_bot");

        using var keyContent = CreateApiKeyRequestContent("bot-key", DateTimeOffset.UtcNow.AddDays(30));
        using HttpResponseMessage response = await HttpClient.PostAsync($"{BaseUrl}/{botId}/api-keys", keyContent);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        string body = await response.Content.ReadAsStringAsync();
        var apiKey = JsonSerializer.Deserialize<CreateBotAccountApiKeyResponse>(body, s_jsonOptions);
        Assert.NotNull(apiKey);
        Assert.Equal("bot-key", apiKey.Name);
        Assert.NotEmpty(apiKey.Key);
        Assert.NotEmpty(apiKey.CreatedByUsername);
    }

    [Fact]
    public async Task GetBotAccount_ShouldIncludeApiKeyCount()
    {
        var botId = await CreateBotAccountAsync("listkey_bot");

        using var keyContent = CreateApiKeyRequestContent("list-key", DateTimeOffset.UtcNow.AddDays(30));
        using HttpResponseMessage createResponse = await HttpClient.PostAsync(
            $"{BaseUrl}/{botId}/api-keys",
            keyContent
        );
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        using HttpResponseMessage getResponse = await HttpClient.GetAsync($"{BaseUrl}/{botId}");

        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        string body = await getResponse.Content.ReadAsStringAsync();
        var botAccount = JsonSerializer.Deserialize<BotAccountResponse>(body, s_jsonOptions);
        Assert.NotNull(botAccount);
        Assert.Equal(1, botAccount.ApiKeyCount);
    }

    [Fact]
    public async Task ListApiKeys_ShouldReturnKeys()
    {
        var botId = await CreateBotAccountAsync("listkey_bot");

        using var keyContent = CreateApiKeyRequestContent("list-key", DateTimeOffset.UtcNow.AddDays(30));
        using HttpResponseMessage createResponse = await HttpClient.PostAsync(
            $"{BaseUrl}/{botId}/api-keys",
            keyContent
        );
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        using HttpResponseMessage listResponse = await HttpClient.GetAsync($"{BaseUrl}/{botId}/api-keys");

        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        string body = await listResponse.Content.ReadAsStringAsync();
        var keys = JsonSerializer.Deserialize<List<BotAccountApiKeyResponse>>(body, s_jsonOptions);
        Assert.NotNull(keys);
        Assert.Contains(keys, k => k.Name == "list-key");
    }

    [Fact]
    public async Task RevokeApiKey_ShouldRemoveFromList()
    {
        var botId = await CreateBotAccountAsync("revokekey_bot");

        using var keyContent = CreateApiKeyRequestContent("revoke-key", DateTimeOffset.UtcNow.AddDays(30));
        using HttpResponseMessage createResponse = await HttpClient.PostAsync(
            $"{BaseUrl}/{botId}/api-keys",
            keyContent
        );
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        string createBody = await createResponse.Content.ReadAsStringAsync();
        var created = JsonSerializer.Deserialize<CreateBotAccountApiKeyResponse>(createBody, s_jsonOptions);

        using HttpResponseMessage revokeResponse = await HttpClient.DeleteAsync(
            $"{BaseUrl}/{botId}/api-keys/{created.Id}"
        );
        Assert.Equal(HttpStatusCode.NoContent, revokeResponse.StatusCode);

        using HttpResponseMessage listResponse = await HttpClient.GetAsync($"{BaseUrl}/{botId}/api-keys");
        string listBody = await listResponse.Content.ReadAsStringAsync();
        var keys = JsonSerializer.Deserialize<List<BotAccountApiKeyResponse>>(listBody, s_jsonOptions);
        Assert.DoesNotContain(keys, k => k.Id == created.Id);
    }

    [Fact]
    public async Task Deactivate_ShouldRevokeAllApiKeys()
    {
        var botId = await CreateBotAccountAsync("deactivatekey_bot");

        using var keyContent = CreateApiKeyRequestContent("will-revoke", DateTimeOffset.UtcNow.AddDays(30));
        using HttpResponseMessage createResponse = await HttpClient.PostAsync(
            $"{BaseUrl}/{botId}/api-keys",
            keyContent
        );
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        using HttpResponseMessage deactivateResponse = await HttpClient.PostAsync(
            $"{BaseUrl}/{botId}/deactivate",
            null
        );
        Assert.Equal(HttpStatusCode.NoContent, deactivateResponse.StatusCode);
    }

    private async Task<Guid> CreateBotAccountAsync(string name)
    {
        using var content = CreateBotAccountRequestContent(name);
        using HttpResponseMessage response = await HttpClient.PostAsync(BaseUrl, content);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        string body = await response.Content.ReadAsStringAsync();
        var bot = JsonSerializer.Deserialize<CreateBotAccountResponse>(body, s_jsonOptions);
        return bot.Id;
    }

    private static StringContent CreateBotAccountRequestContent(string name)
    {
        string json = JsonSerializer.Serialize(new { name });
        return new StringContent(json, Encoding.UTF8, MediaTypeNames.Application.Json);
    }

    private static StringContent CreateApiKeyRequestContent(string name, DateTimeOffset expiresAt)
    {
        string json = JsonSerializer.Serialize(new { name, expiresAt });
        return new StringContent(json, Encoding.UTF8, MediaTypeNames.Application.Json);
    }
}
