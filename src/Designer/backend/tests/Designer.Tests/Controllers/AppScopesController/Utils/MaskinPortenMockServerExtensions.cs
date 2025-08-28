using System.Net.Mime;
using Designer.Tests.Fixtures;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;

namespace Designer.Tests.Controllers.AppScopesController.Utils;

public static class MaskinPortenMockServerExtensions
{
    public static void PrepareMaskinPortenScopesResponse(this MockServerFixture mockServerFixture, string responseJson)
    {
        var request = Request.Create()
            .UsingGet()
            .WithPath("/datasharing/consumer/scope/access");

        var response = Response.Create()
            .WithStatusCode(200)
            .WithHeader("content-type", MediaTypeNames.Application.Json)
            .WithBody(responseJson);

        mockServerFixture.MockApi.Given(request)
            .RespondWith(
                response
                );

    }

}
