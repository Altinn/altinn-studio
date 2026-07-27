using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Fixtures;
using Designer.Tests.Helpers;
using Xunit;

namespace Designer.Tests.StudioOidcGiteaIntegrationTests;

public class LogoutStudioOidcTests : StudioOidcGiteaIntegrationTestsBase<LogoutStudioOidcTests>
{
    private readonly StudioOidcGiteaWebAppApplicationFactoryFixture<Program> _factory;

    public LogoutStudioOidcTests(
        StudioOidcGiteaWebAppApplicationFactoryFixture<Program> factory,
        StudioOidcGiteaFixture giteaFixture,
        StudioOidcSharedDesignerHttpClientProvider sharedDesignerHttpClientProvider
    )
        : base(factory, giteaFixture, sharedDesignerHttpClientProvider)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Logout_WhenAuthenticated_RedirectsToEndSessionEndpointAndClearsCookie()
    {
        using HttpResponseMessage loginResponse = await HttpClient.GetAsync("designer/api/user/current");
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

        using HttpResponseMessage logoutResponse = await HttpClient.GetAsync("Home/Logout");

        Assert.Equal(HttpStatusCode.Redirect, logoutResponse.StatusCode);

        string location = logoutResponse.Headers.Location!.ToString();
        Assert.StartsWith(GiteaFixture.FakeAnsattportenUrl, location);
        Assert.Contains("/endsession", location);
        Assert.Matches(@"[?&]id_token_hint=[^&]+", location);
        Assert.Matches(@"[?&]client_id=[^&]+", location);
        Assert.Contains("post_logout_redirect_uri=", location);
        Assert.Contains("signout-callback-oidc", location);

        Assert.Contains(
            logoutResponse.GetCookies("AltinnStudioDesigner"),
            cookie => cookie.Contains("AltinnStudioDesigner=;")
        );
    }

    [Fact]
    public async Task Logout_AfterTokenRefresh_StillIncludesIdTokenHint()
    {
        using HttpResponseMessage initialResponse = await HttpClient.GetAsync("designer/api/user/current");
        Assert.Equal(HttpStatusCode.OK, initialResponse.StatusCode);

        _factory.FakeTimeProvider.Advance(TimeSpan.FromMinutes(60));

        using HttpResponseMessage refreshedResponse = await HttpClient.GetAsync("designer/api/user/current");
        Assert.Equal(HttpStatusCode.OK, refreshedResponse.StatusCode);

        using HttpResponseMessage logoutResponse = await HttpClient.GetAsync("Home/Logout");

        Assert.Equal(HttpStatusCode.Redirect, logoutResponse.StatusCode);
        Assert.Matches(@"[?&]id_token_hint=[^&]+", logoutResponse.Headers.Location!.ToString());
    }
}
