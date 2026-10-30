using System.Net;
using System.Net.Http;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.FrontendEnvironmentController;

public class GetEnvironmentTests
    : DesignerEndpointsTestsBase<GetEnvironmentTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Url = "/designer/config/env.json";

    public GetEnvironmentTests(WebApplicationFactory<Program> factory)
        : base(factory)
    {
        JsonConfigOverrides.Add(
            """
            {
                "FrontendEnvironmentSettings": {
                    "AiConnectionString": "InstrumentationKey=test",
                    "PostHogApiKey": "phc_test",
                    "PostHogApiHost": "https://posthog.example"
                },
                "StudioOidcLoginSettings": {
                    "AccountLinkUrl": "https://studio.example/repos/user/oauth2/ansattporten"
                }
            }
            """
        );
    }

    [Fact]
    public async Task GetEnvironment_AnonymousUser_ReturnsFrontendSettingsWithTheNamesTheFrontendReads()
    {
        HttpClient anonymousClient = CreateTestClientWithAuthHandler<UnauthenticatedTestAuthHandler>();

        using HttpResponseMessage response = await anonymousClient.GetAsync(Url);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonNode environment = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        Assert.Equal("InstrumentationKey=test", environment["aiConnectionString"]?.GetValue<string>());
        Assert.Equal("phc_test", environment["postHogApiKey"]?.GetValue<string>());
        Assert.Equal("https://posthog.example", environment["postHogApiHost"]?.GetValue<string>());
        Assert.Equal(
            "https://studio.example/repos/user/oauth2/ansattporten",
            environment["accountLinkUrl"]?.GetValue<string>()
        );
    }
}
