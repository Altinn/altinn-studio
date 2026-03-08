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

    private static StringContent CreateTokenRequestContent(string name, DateTimeOffset expiresAt)
    {
        string json = JsonSerializer.Serialize(new { name, expiresAt });
        return new StringContent(json, Encoding.UTF8, MediaTypeNames.Application.Json);
    }
}
