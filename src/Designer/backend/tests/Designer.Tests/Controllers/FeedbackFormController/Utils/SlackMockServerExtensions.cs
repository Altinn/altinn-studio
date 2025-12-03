using System.Net.Mime;
using Designer.Tests.Fixtures;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;

namespace Designer.Tests.Controllers.FeedbackFormController.Utils;

public static class SlackMockServerExtensions
{
    public static void PrepareSlackResponse(this MockServerFixture mockServerFixture, string path)
    {
        var request = Request.Create()
            .UsingPost()
            .WithPath("/");

        var response = Response.Create()
            .WithStatusCode(200)
            .WithHeader("content-type", MediaTypeNames.Application.Json);

        mockServerFixture.MockApi.Given(request)
            .RespondWith(
                response
                );

    }

}
