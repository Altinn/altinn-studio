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

public class DeactivateBotAccountStudioOidcTests
    : StudioOidcGiteaIntegrationTestsBase<DeactivateBotAccountStudioOidcTests>
{
    private static readonly JsonSerializerOptions s_jsonOptions = new() { PropertyNameCaseInsensitive = true };

    private const string BaseUrl = "designer/api/v1/orgs/ttd/bot-accounts";

    public DeactivateBotAccountStudioOidcTests(
        StudioOidcGiteaWebAppApplicationFactoryFixture<Program> factory,
        StudioOidcGiteaFixture giteaFixture,
        StudioOidcSharedDesignerHttpClientProvider sharedDesignerHttpClientProvider
    )
        : base(factory, giteaFixture, sharedDesignerHttpClientProvider) { }

    [Fact]
    public async Task Deactivate_ShouldReturnNoContent_AndRemoveFromList()
    {
        using var content = CreateBotAccountRequestContent("deactivate_bot");
        using HttpResponseMessage createResponse = await HttpClient.PostAsync(BaseUrl, content);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        string createBody = await createResponse.Content.ReadAsStringAsync();
        var created = JsonSerializer.Deserialize<CreateBotAccountResponse>(createBody, s_jsonOptions);

        using HttpResponseMessage deactivateResponse = await HttpClient.PostAsync(
            $"{BaseUrl}/{created.Id}/deactivate",
            null
        );

        Assert.Equal(HttpStatusCode.NoContent, deactivateResponse.StatusCode);

        using HttpResponseMessage listResponse = await HttpClient.GetAsync(BaseUrl);
        string listBody = await listResponse.Content.ReadAsStringAsync();
        var bots = JsonSerializer.Deserialize<List<BotAccountResponse>>(listBody, s_jsonOptions);
        Assert.DoesNotContain(bots, b => b.Id == created.Id);
    }

    private static StringContent CreateBotAccountRequestContent(string name)
    {
        string json = JsonSerializer.Serialize(new { name });
        return new StringContent(json, Encoding.UTF8, MediaTypeNames.Application.Json);
    }
}
