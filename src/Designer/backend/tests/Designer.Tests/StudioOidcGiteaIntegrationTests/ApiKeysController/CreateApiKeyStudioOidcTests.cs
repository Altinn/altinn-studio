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

namespace Designer.Tests.StudioOidcGiteaIntegrationTests.ApiKeysController;

public class CreateApiKeyStudioOidcTests : StudioOidcGiteaIntegrationTestsBase<CreateApiKeyStudioOidcTests>
{
    private static readonly JsonSerializerOptions s_jsonOptions = new() { PropertyNameCaseInsensitive = true };

    private const string BaseUrl = "designer/api/v1/user/api-keys";

    public CreateApiKeyStudioOidcTests(
        StudioOidcGiteaWebAppApplicationFactoryFixture<Program> factory,
        StudioOidcGiteaFixture giteaFixture,
        StudioOidcSharedDesignerHttpClientProvider sharedDesignerHttpClientProvider
    )
        : base(factory, giteaFixture, sharedDesignerHttpClientProvider) { }

    [Fact]
    public async Task Create_ShouldReturnCreatedWithToken()
    {
        using var content = CreateTokenRequestContent("test-token", DateTimeOffset.UtcNow.AddDays(30));

        using HttpResponseMessage response = await HttpClient.PostAsync(BaseUrl, content);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        string body = await response.Content.ReadAsStringAsync();
        var token = JsonSerializer.Deserialize<CreateApiKeyResponse>(body, s_jsonOptions);
        Assert.NotNull(token);
        Assert.Equal("test-token", token.Name);
        Assert.NotEmpty(token.Key);
        Assert.True(token.Id > 0);
    }

    [Fact]
    public async Task Create_WithEmptyName_ShouldReturnBadRequest()
    {
        using var content = CreateTokenRequestContent("", DateTimeOffset.UtcNow.AddDays(30));

        using HttpResponseMessage response = await HttpClient.PostAsync(BaseUrl, content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_WithWhitespaceName_ShouldReturnBadRequest()
    {
        using var content = CreateTokenRequestContent("   ", DateTimeOffset.UtcNow.AddDays(30));

        using HttpResponseMessage response = await HttpClient.PostAsync(BaseUrl, content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private static StringContent CreateTokenRequestContent(string name, DateTimeOffset expiresAt)
    {
        string json = JsonSerializer.Serialize(new { name, expiresAt });
        return new StringContent(json, Encoding.UTF8, MediaTypeNames.Application.Json);
    }
}
