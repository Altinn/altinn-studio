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

    private static StringContent CreateBotAccountRequestContent(string name)
    {
        string json = JsonSerializer.Serialize(new { name });
        return new StringContent(json, Encoding.UTF8, MediaTypeNames.Application.Json);
    }
}
