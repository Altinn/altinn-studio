using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Auth;
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

    private async Task<HttpResponseMessage> GetCurrentParty(string? partyCookie, bool returnPartyObject)
    {
        // includeTraceContext builds the client without a cookie container, which would reject foreign-domain Set-Cookies
        HttpClient client = GetRootedClient(Org, App, includeTraceContext: true);
        string token = TestAuthentication.GetUserToken(userId: UserId, partyId: UserPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{Org}/{App}/api/authorization/parties/current?returnPartyObject={returnPartyObject}"
        );
        if (partyCookie is not null)
            request.Headers.Add("Cookie", $"AltinnPartyId={partyCookie}");

        return await client.SendAsync(request);
    }

    private static async Task<int> ReadPartyId(HttpResponseMessage response, bool returnPartyObject)
    {
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return returnPartyObject ? json.RootElement.GetProperty("partyId").GetInt32() : json.RootElement.GetInt32();
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task GetCurrentParty_NoCookie_ReturnsOwnParty(bool returnPartyObject)
    {
        using var response = await GetCurrentParty(partyCookie: null, returnPartyObject);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(UserPartyId, await ReadPartyId(response, returnPartyObject));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task GetCurrentParty_UsableCookie_ReturnsSelectedParty(bool returnPartyObject)
    {
        OverrideServicesForThisTest = services =>
        {
            var authorizationClient = new Mock<IAuthorizationClient>();
            authorizationClient
                .Setup(x => x.GetPartyList(It.IsAny<StorageAuthenticationMethod?>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync([new Party { PartyId = 500000 }]);
            services.AddSingleton(authorizationClient.Object);
        };

        using var response = await GetCurrentParty(partyCookie: "500000", returnPartyObject);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(500000, await ReadPartyId(response, returnPartyObject));
        response.Headers.TryGetValues("Set-Cookie", out var setCookies);
        Assert.DoesNotContain(
            setCookies ?? [],
            c => c.StartsWith("AltinnPartyId=", StringComparison.OrdinalIgnoreCase)
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task GetCurrentParty_TwoCookiesThatDisagree_ClearsCookieEverywhereAndReturnsNoContent_WithoutLookingUp(
        bool returnPartyObject
    )
    {
        OverrideServicesForThisTest = services =>
            services.PostConfigure<GeneralSettings>(settings => settings.HostName = "tt02.altinn.no");

        // 501338 has no test data, so a lookup would throw
        using var response = await GetCurrentParty(partyCookie: "500000; AltinnPartyId=501338", returnPartyObject);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var cookies = response.Headers.GetValues("Set-Cookie").Select(c => c.ToLowerInvariant()).ToList();
        Assert.Equal(3, cookies.Count);
        Assert.All(cookies, c => Assert.StartsWith("altinnpartyid=;", c));
        Assert.Contains(cookies, c => !c.Contains("domain="));
        Assert.Contains(cookies, c => c.Contains("domain=tt02.altinn.no"));
        Assert.Contains(cookies, c => c.Contains("domain=altinn.no"));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task GetCurrentParty_CookieNamesPartyRegisterWontGive_ClearsCookieAndReturnsNoContent(
        bool returnPartyObject
    )
    {
        const int stalePartyId = 501338;
        OverrideServicesForThisTest = services =>
        {
            var partyClient = new Mock<IAltinnPartyClient>();
            partyClient.Setup(x => x.GetParty(stalePartyId)).ReturnsAsync((Party?)null);
            services.AddSingleton(partyClient.Object);
        };

        using var response = await GetCurrentParty(partyCookie: stalePartyId.ToString(), returnPartyObject);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Contains(response.Headers.GetValues("Set-Cookie"), c => c.StartsWith("AltinnPartyId=;"));
    }
}
