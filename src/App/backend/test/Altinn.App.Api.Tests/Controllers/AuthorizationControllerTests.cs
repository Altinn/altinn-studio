using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Internal.Registers;
using Altinn.Platform.Register.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class AuthorizationControllerTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
    : ApiTestBase(factory, outputHelper),
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "tdd";
    private const string App = "contributer-restriction";
    private const int UserId = 1337;
    private const int UserPartyId = 501337;

    private async Task<HttpResponseMessage> GetCurrentParty(string? partyCookie)
    {
        // includeTraceContext builds the client without a cookie container, which would reject foreign-domain Set-Cookies
        HttpClient client = GetRootedClient(Org, App, includeTraceContext: true);
        string token = TestAuthentication.GetUserToken(userId: UserId, partyId: UserPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{Org}/{App}/api/authorization/parties/current?returnPartyObject=true"
        );
        if (partyCookie is not null)
            request.Headers.Add("Cookie", $"AltinnPartyId={partyCookie}");

        return await client.SendAsync(request);
    }

    private static async Task<int> ReadPartyId(HttpResponseMessage response)
    {
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return json.RootElement.GetProperty("partyId").GetInt32();
    }

    [Fact]
    public async Task GetCurrentParty_NoCookie_ReturnsOwnParty()
    {
        using var response = await GetCurrentParty(partyCookie: null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(UserPartyId, await ReadPartyId(response));
    }

    [Fact]
    public async Task GetCurrentParty_UsableCookie_ReturnsSelectedParty()
    {
        using var response = await GetCurrentParty(partyCookie: "500000");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(500000, await ReadPartyId(response));
    }

    [Fact]
    public async Task GetCurrentParty_TwoCookiesThatDisagree_ClearsCookieEverywhereAndReturnsNoContent_WithoutLookingUp()
    {
        OverrideServicesForThisTest = services =>
            services.PostConfigure<GeneralSettings>(settings => settings.HostName = "tt02.altinn.no");

        // 501338 has no test data, so a lookup would throw
        using var response = await GetCurrentParty(partyCookie: "500000; AltinnPartyId=501338");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var cookies = response.Headers.GetValues("Set-Cookie").Select(c => c.ToLowerInvariant()).ToList();
        Assert.Equal(3, cookies.Count);
        Assert.All(cookies, c => Assert.StartsWith("altinnpartyid=;", c));
        Assert.Contains(cookies, c => !c.Contains("domain="));
        Assert.Contains(cookies, c => c.Contains("domain=tt02.altinn.no"));
        Assert.Contains(cookies, c => c.Contains("domain=altinn.no"));
    }

    [Fact]
    public async Task GetCurrentParty_CookieNamesPartyRegisterWontGive_ClearsCookieAndReturnsNoContent()
    {
        const int stalePartyId = 501338;
        OverrideServicesForThisTest = services =>
        {
            var partyClient = new Mock<IAltinnPartyClient>();
            partyClient.Setup(x => x.GetParty(stalePartyId)).ReturnsAsync((Party?)null);
            services.AddSingleton(partyClient.Object);
        };

        using var response = await GetCurrentParty(partyCookie: stalePartyId.ToString());

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Contains(response.Headers.GetValues("Set-Cookie"), c => c.StartsWith("AltinnPartyId=;"));
    }
}
