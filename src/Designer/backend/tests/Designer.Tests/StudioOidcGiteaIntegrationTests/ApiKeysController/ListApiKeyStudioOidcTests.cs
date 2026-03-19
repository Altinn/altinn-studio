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

namespace Designer.Tests.StudioOidcGiteaIntegrationTests.ApiKeysController;

public class ListApiKeyStudioOidcTests : StudioOidcGiteaIntegrationTestsBase<ListApiKeyStudioOidcTests>
{
    private static readonly JsonSerializerOptions s_jsonOptions = new() { PropertyNameCaseInsensitive = true };

    private const string BaseUrl = "designer/api/v1/user/api-keys";

    public ListApiKeyStudioOidcTests(
        StudioOidcGiteaWebAppApplicationFactoryFixture<Program> factory,
        StudioOidcGiteaFixture giteaFixture,
        StudioOidcSharedDesignerHttpClientProvider sharedDesignerHttpClientProvider
    )
        : base(factory, giteaFixture, sharedDesignerHttpClientProvider) { }

    [Fact]
    public async Task List_AfterCreatingTokens_ShouldReturnAllTokens()
    {
        using var content1 = CreateTokenRequestContent("list-token-1", DateTimeOffset.UtcNow.AddDays(30));
        using var content2 = CreateTokenRequestContent("list-token-2", DateTimeOffset.UtcNow.AddDays(60));
        using HttpResponseMessage createResponse1 = await HttpClient.PostAsync(BaseUrl, content1);
        using HttpResponseMessage createResponse2 = await HttpClient.PostAsync(BaseUrl, content2);
        Assert.Equal(HttpStatusCode.Created, createResponse1.StatusCode);
        Assert.Equal(HttpStatusCode.Created, createResponse2.StatusCode);

        using HttpResponseMessage listResponse = await HttpClient.GetAsync(BaseUrl);

        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        string body = await listResponse.Content.ReadAsStringAsync();
        var tokens = JsonSerializer.Deserialize<List<ApiKeyResponse>>(body, s_jsonOptions);
        Assert.NotNull(tokens);
        Assert.Contains(tokens, t => t.Name == "list-token-1");
        Assert.Contains(tokens, t => t.Name == "list-token-2");
    }

    private static StringContent CreateTokenRequestContent(string name, DateTimeOffset expiresAt)
    {
        string json = JsonSerializer.Serialize(new { name, expiresAt });
        return new StringContent(json, Encoding.UTF8, MediaTypeNames.Application.Json);
    }
}
