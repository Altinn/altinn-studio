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

namespace Designer.Tests.StudioOidcGiteaIntegrationTests.PersonalAccessTokensController;

public class RevokePatStudioOidcTests : StudioOidcGiteaIntegrationTestsBase<RevokePatStudioOidcTests>
{
    private static readonly JsonSerializerOptions s_jsonOptions = new() { PropertyNameCaseInsensitive = true };

    private const string BaseUrl = "designer/api/v1/user/personal-access-tokens";

    public RevokePatStudioOidcTests(
        StudioOidcGiteaWebAppApplicationFactoryFixture<Program> factory,
        StudioOidcGiteaFixture giteaFixture,
        StudioOidcSharedDesignerHttpClientProvider sharedDesignerHttpClientProvider
    )
        : base(factory, giteaFixture, sharedDesignerHttpClientProvider) { }

    [Fact]
    public async Task Revoke_ShouldRemoveTokenFromList()
    {
        using var content = CreateTokenRequestContent("revoke-token", DateTimeOffset.UtcNow.AddDays(30));
        using HttpResponseMessage createResponse = await HttpClient.PostAsync(BaseUrl, content);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        string createBody = await createResponse.Content.ReadAsStringAsync();
        var created = JsonSerializer.Deserialize<CreatePersonalAccessTokenResponse>(createBody, s_jsonOptions);

        using HttpResponseMessage revokeResponse = await HttpClient.DeleteAsync($"{BaseUrl}/{created.Id}");

        Assert.Equal(HttpStatusCode.NoContent, revokeResponse.StatusCode);

        using HttpResponseMessage listResponse = await HttpClient.GetAsync(BaseUrl);
        string listBody = await listResponse.Content.ReadAsStringAsync();
        var tokens = JsonSerializer.Deserialize<List<PersonalAccessTokenResponse>>(listBody, s_jsonOptions);
        Assert.DoesNotContain(tokens, t => t.Id == created.Id);
    }

    private static StringContent CreateTokenRequestContent(string name, DateTimeOffset expiresAt)
    {
        string json = JsonSerializer.Serialize(new { name, expiresAt });
        return new StringContent(json, Encoding.UTF8, MediaTypeNames.Application.Json);
    }
}
