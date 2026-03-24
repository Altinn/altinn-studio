using System.Net.Mime;
using Designer.Tests.Fixtures;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;

namespace Designer.Tests.Controllers.AppScopesController.Utils;

public static class MaskinPortenMockServerExtensions
{
    public static void PrepareMaskinPortenScopesResponse(
        this MockServerFixture mockServerFixture,
        string allScopesJson,
        string accessScopesJson
    )
    {
        var allScopesRequest = Request
            .Create()
            .UsingGet()
            .WithPath("/api/v1/scopes/all")
            .WithParam("accessible_for_all", "true")
            .WithParam("integration_type", "maskinporten")
            .WithParam("inactive", "false");

        var allScopesResponse = Response
            .Create()
            .WithStatusCode(200)
            .WithHeader("content-type", MediaTypeNames.Application.Json)
            .WithBody(allScopesJson);

        mockServerFixture.MockApi.Given(allScopesRequest).RespondWith(allScopesResponse);

        var accessScopesRequest = Request
            .Create()
            .UsingGet()
            .WithPath("/api/v1/scopes/access/all")
            .WithParam("integration_type", "maskinporten")
            .WithParam("inactive", "false");

        var accessScopesResponse = Response
            .Create()
            .WithStatusCode(200)
            .WithHeader("content-type", MediaTypeNames.Application.Json)
            .WithBody(accessScopesJson);

        mockServerFixture.MockApi.Given(accessScopesRequest).RespondWith(accessScopesResponse);
    }
}
