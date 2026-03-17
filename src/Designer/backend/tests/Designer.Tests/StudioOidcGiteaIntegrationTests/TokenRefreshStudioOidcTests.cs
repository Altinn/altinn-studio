using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Fixtures;
using Xunit;

namespace Designer.Tests.StudioOidcGiteaIntegrationTests;

public class TokenRefreshStudioOidcTests : StudioOidcGiteaIntegrationTestsBase<TokenRefreshStudioOidcTests>
{
    private readonly StudioOidcGiteaWebAppApplicationFactoryFixture<Program> _factory;

    public TokenRefreshStudioOidcTests(
        StudioOidcGiteaWebAppApplicationFactoryFixture<Program> factory,
        StudioOidcGiteaFixture giteaFixture,
        StudioOidcSharedDesignerHttpClientProvider sharedDesignerHttpClientProvider
    )
        : base(factory, giteaFixture, sharedDesignerHttpClientProvider)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Request_AfterTokenExpiry_ShouldRefreshWithoutReLogin()
    {
        // First request triggers OIDC login and establishes session with tokens
        using HttpResponseMessage initialResponse = await HttpClient.GetAsync("designer/api/user/current");
        Assert.Equal(HttpStatusCode.OK, initialResponse.StatusCode);

        // Listen for token refresh activity
        var refreshActivities = new List<Activity>();
        using var listener = new ActivityListener
        {
            ShouldListenTo = source => source.Name == "studio-designer",
            Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllDataAndRecorded,
            ActivityStopped = activity =>
            {
                if (activity.OperationName == "oidc.token_refresh")
                {
                    refreshActivities.Add(activity);
                }
            },
        };
        ActivitySource.AddActivityListener(listener);

        // Advance fake time past token expiry (tokens expire in 3600s, refresh buffer is 60s)
        _factory.FakeTimeProvider.Advance(TimeSpan.FromMinutes(60));

        // Second request should trigger token refresh via RefreshAccessTokenIfExpired
        using HttpResponseMessage refreshedResponse = await HttpClient.GetAsync("designer/api/user/current");
        Assert.Equal(HttpStatusCode.OK, refreshedResponse.StatusCode);

        // Verify at least one successful refresh was triggered via telemetry
        Assert.NotEmpty(refreshActivities);
        Assert.Contains(refreshActivities, a => a.Status == ActivityStatusCode.Ok);
    }
}
