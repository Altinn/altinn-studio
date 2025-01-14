using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Designer.Tests.Controllers.ContactController;

public class FetchBelongsToOrgTests : DesignerEndpointsTestsBase<FetchBelongsToOrgTests>,
    IClassFixture<WebApplicationFactory<Program>>
{
    public FetchBelongsToOrgTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }


    [Fact]
    public async Task UsersThatBelongsToOrg_ShouldReturn_True()
    {
        string url = "/designer/api/contact/belongs-to-org";

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

        var response = await HttpClient.SendAsync(httpRequestMessage);
        var responseContent = await response.Content.ReadAsAsync<BelongsToOrgDto>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(responseContent.BelongsToOrg);
    }

    [Fact]
    public async Task UsersThatDoNotBelongsToOrg_ShouldReturn_False_IfAnonymousUser()
    {
        var anonymousClient = Factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((context, configBuilder) =>
            {
                var config = new Dictionary<string, string>
                {
                    { "Oidc:ClientId", "dummy-client-id" },
                    { "Oidc:ClientSecret", "dummy-client-secret" },
                    { "Oidc:Authority", "https://dummy-authority" }
                };
                configBuilder.AddInMemoryCollection(config);
            });

            builder.ConfigureTestServices(services =>
            {
                services.AddAuthentication("Anonymous")
                    .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Anonymous", options => { });
            });
        }).CreateDefaultClient();

        string url = "/designer/api/contact/belongs-to-org";

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

        var response = await anonymousClient.SendAsync(httpRequestMessage);
        var responseContent = await response.Content.ReadAsAsync<BelongsToOrgDto>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(responseContent.BelongsToOrg);  // Expecting false as the user is anonymous
    }
}
