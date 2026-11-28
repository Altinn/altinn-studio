using System.Net;
using Altinn.App.Tests.Common;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Clients;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace Altinn.App.Api.Tests.Extensions;

public class ServiceCollectionExtensionsTests
{
    [Fact]
    public async Task AddAltinnAppServices_RetriesPdpRequestOnce_WhenFirstAttemptFails()
    {
        int attempts = 0;
        await using var app = AppBuilder.Build(
            configData: [new("PlatformSettings:ApiAuthorizationEndpoint", "http://localhost/authorization/api/v1/")],
            overrideAltinnAppServices: services =>
                services
                    .AddHttpClient<AuthorizationApiClient>()
                    .ConfigurePrimaryHttpMessageHandler(() =>
                        new MockHttpMessageHandler(
                            _ =>
                            {
                                attempts++;
                                if (attempts == 1)
                                {
                                    throw new HttpRequestException("An error occurred while sending the request.");
                                }

                                return Task.FromResult(
                                    new HttpResponseMessage(HttpStatusCode.OK)
                                    {
                                        Content = new StringContent("""{"Response":[{"Decision":"Permit"}]}"""),
                                    }
                                );
                            },
                            NullLogger<MockHttpMessageHandler>.Instance
                        )
                    )
        );
        var client = app.Services.GetRequiredService<AuthorizationApiClient>();

        XacmlJsonResponse response = await client.AuthorizeRequest(
            new XacmlJsonRequestRoot { Request = new XacmlJsonRequest() }
        );

        Assert.Equal("Permit", Assert.Single(response.Response).Decision);
        Assert.Equal(2, attempts);
    }
}
