using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.ApiKeyAuth;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Fixtures;
using Xunit;

namespace Designer.Tests.StudioOidcGiteaIntegrationTests.ApiKeysController;

public class ApiKeyAuthStudioOidcTests : StudioOidcGiteaIntegrationTestsBase<ApiKeyAuthStudioOidcTests>
{
    private static readonly JsonSerializerOptions s_jsonOptions = new() { PropertyNameCaseInsensitive = true };

    private const string BaseUrl = "designer/api/v1/user/api-keys";

    public ApiKeyAuthStudioOidcTests(
        StudioOidcGiteaWebAppApplicationFactoryFixture<Program> factory,
        StudioOidcGiteaFixture giteaFixture,
        StudioOidcSharedDesignerHttpClientProvider sharedDesignerHttpClientProvider
    )
        : base(factory, giteaFixture, sharedDesignerHttpClientProvider) { }

    [Fact]
    public async Task List_WithApiKey_ShouldReturnOk()
    {
        using var createContent = CreateTokenRequestContent("api-key-token", DateTimeOffset.UtcNow.AddDays(30));
        using HttpResponseMessage createResponse = await HttpClient.PostAsync(BaseUrl, createContent);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        string createBody = await createResponse.Content.ReadAsStringAsync();
        var created = JsonSerializer.Deserialize<CreateApiKeyResponse>(createBody, s_jsonOptions);

        using var unauthenticatedClient = new HttpClient { BaseAddress = new Uri(GiteaFixture.DesignerUrl) };
        unauthenticatedClient.DefaultRequestHeaders.Add(ApiKeyAuthenticationDefaults.HeaderName, created.Key);

        using HttpResponseMessage listResponse = await unauthenticatedClient.GetAsync(BaseUrl);

        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        string listBody = await listResponse.Content.ReadAsStringAsync();
        var tokens = JsonSerializer.Deserialize<List<ApiKeyResponse>>(listBody, s_jsonOptions);
        Assert.NotNull(tokens);
        Assert.Contains(tokens, t => t.Name == "api-key-token");
    }

    [Theory]
    [InlineData("designer/api/user/current", "scope-test-user")]
    [InlineData("designer/api/orgs", "scope-test-orgs")]
    public async Task NonWhitelistedEndpoint_WithApiKey_ShouldReturnForbidden(string endpoint, string tokenName)
    {
        using var createContent = CreateTokenRequestContent(tokenName, DateTimeOffset.UtcNow.AddDays(30));
        using HttpResponseMessage createResponse = await HttpClient.PostAsync(BaseUrl, createContent);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        string createBody = await createResponse.Content.ReadAsStringAsync();
        var created = JsonSerializer.Deserialize<CreateApiKeyResponse>(createBody, s_jsonOptions);

        using var apiKeyClient = new HttpClient { BaseAddress = new Uri(GiteaFixture.DesignerUrl) };
        apiKeyClient.DefaultRequestHeaders.Add(ApiKeyAuthenticationDefaults.HeaderName, created.Key);

        using HttpResponseMessage response = await apiKeyClient.GetAsync(endpoint);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Create_WithApiKey_ShouldNotCreateAnotherKey(bool forBotAccount)
    {
        using var createContent = CreateTokenRequestContent(
            $"parent-key-{forBotAccount}",
            DateTimeOffset.UtcNow.AddDays(30)
        );
        using HttpResponseMessage createResponse = await HttpClient.PostAsync(BaseUrl, createContent);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = JsonSerializer.Deserialize<CreateApiKeyResponse>(
            await createResponse.Content.ReadAsStringAsync(),
            s_jsonOptions
        );
        Assert.NotNull(created);

        string targetUrl = BaseUrl;
        if (forBotAccount)
        {
            const string BotAccountsUrl = "designer/api/v1/orgs/ttd/bot-accounts";
            using var botContent = new StringContent(
                JsonSerializer.Serialize(new { name = "key_creation_guard" }),
                Encoding.UTF8,
                MediaTypeNames.Application.Json
            );
            using HttpResponseMessage botResponse = await HttpClient.PostAsync(BotAccountsUrl, botContent);
            Assert.Equal(HttpStatusCode.Created, botResponse.StatusCode);
            var bot = JsonSerializer.Deserialize<CreateBotAccountResponse>(
                await botResponse.Content.ReadAsStringAsync(),
                s_jsonOptions
            );
            Assert.NotNull(bot);
            targetUrl = $"{BotAccountsUrl}/{bot.Id}/api-keys";
        }

        using var apiKeyClient = new HttpClient { BaseAddress = new Uri(GiteaFixture.DesignerUrl) };
        apiKeyClient.DefaultRequestHeaders.Add(ApiKeyAuthenticationDefaults.HeaderName, created.Key);

        // Prove that the parent key is valid before checking its creation restrictions.
        using HttpResponseMessage listResponse = await apiKeyClient.GetAsync(BaseUrl);
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);

        using var childContent = CreateTokenRequestContent("forbidden-child-key", DateTimeOffset.UtcNow.AddDays(60));
        using HttpResponseMessage response = await apiKeyClient.PostAsync(targetUrl, childContent);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        using HttpResponseMessage keysResponse = await HttpClient.GetAsync(targetUrl);
        Assert.Equal(HttpStatusCode.OK, keysResponse.StatusCode);
        var keys = JsonSerializer.Deserialize<List<ApiKeyResponse>>(
            await keysResponse.Content.ReadAsStringAsync(),
            s_jsonOptions
        );
        Assert.NotNull(keys);
        Assert.DoesNotContain(keys, key => key.Name == "forbidden-child-key");
    }

    private static StringContent CreateTokenRequestContent(string name, DateTimeOffset expiresAt)
    {
        string json = JsonSerializer.Serialize(new { name, expiresAt });
        return new StringContent(json, Encoding.UTF8, MediaTypeNames.Application.Json);
    }
}
