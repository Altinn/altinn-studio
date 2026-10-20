using System.Net;
using System.Net.Http.Headers;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class PartiesControllerTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
    : ApiTestBase(factory, outputHelper),
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "tdd";
    private const string App = "contributer-restriction";
    private const int UserId = 1337;
    private const int UserPartyId = 501337;

    private async Task<HttpResponseMessage> UpdateSelectedParty(int partyId)
    {
        // includeTraceContext builds the client without a cookie container, which would reject foreign-domain Set-Cookies
        HttpClient client = GetRootedClient(Org, App, includeTraceContext: true);
        string token = TestAuthentication.GetUserToken(userId: UserId, partyId: UserPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        return await client.PutAsync($"{Org}/{App}/api/v1/parties/{partyId}", content: null);
    }

    [Fact]
    public async Task UpdateSelectedParty_WritesSelectionAtHostNameAndExpiresItOnParentDomains()
    {
        OverrideServicesForThisTest = services =>
            services.PostConfigure<GeneralSettings>(settings => settings.HostName = "tt02.altinn.no");

        using var response = await UpdateSelectedParty(UserPartyId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var cookies = response.Headers.GetValues("Set-Cookie").Select(c => c.ToLowerInvariant()).ToList();
        Assert.Equal(3, cookies.Count);
        Assert.Contains(cookies, c => c.StartsWith("altinnpartyid=501337;") && c.Contains("domain=tt02.altinn.no"));
        Assert.Contains(cookies, c => c.StartsWith("altinnpartyid=;") && !c.Contains("domain="));
        Assert.Contains(
            cookies,
            c => c.StartsWith("altinnpartyid=;") && c.Contains("domain=altinn.no") && c.Contains("expires=")
        );
    }
}
