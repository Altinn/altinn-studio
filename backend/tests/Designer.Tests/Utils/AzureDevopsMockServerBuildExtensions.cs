using System.Net.Mime;
using Designer.Tests.Fixtures;
using WireMock.Matchers;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;

namespace Designer.Tests.Utils;

public static class AzureDevopsMockServerBuildExtensions
{
    public static void PrepareQueueBuildResponse(this MockServerFixture mockServerFixture, int buildId, string responseJson)
    {
        var request = Request.Create()
            .UsingPost()
            .WithPath("/build/builds")
            .WithParam("api-version", "5.1");

        var response = Response.Create()
            .WithStatusCode(201)
            .WithHeader("content-type", MediaTypeNames.Application.Json)
            .WithBody(responseJson);

        mockServerFixture.MockApi.Given(request)
            .RespondWith(
                response
            );
    }
}
