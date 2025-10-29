#nullable disable
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.FeedbackFormController.Base;
using Designer.Tests.Controllers.FeedbackFormController.Utils;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.FeedbackFormController;

public class SendMessageToSlackTests : FeedbackFormControllerTestBase<SendMessageToSlackTests>, IClassFixture<WebApplicationFactory<Program>>, IClassFixture<MockServerFixture>
{
    private static string VersionPrefix(string org, string repository) =>
        $"/designer/api/{org}/{repository}/feedbackform/submit";

    private readonly MockServerFixture _mockServerFixture;

    public SendMessageToSlackTests(WebApplicationFactory<Program> factory, MockServerFixture mockServerFixture) : base(factory)
    {
        _mockServerFixture = mockServerFixture;
        JsonConfigOverrides.Add(
            $$"""
                    {
                      "FeedbackFormSettings" : {
                            "SlackSettings": {
                                "WebhookUrl": "{{mockServerFixture.MockApi.Url}}"
                            }
                        }
                    }
                """
        );
    }

    [Fact]
    public async Task SendMessageToSlack_Should_ReturnOk()
    {
        _mockServerFixture.PrepareSlackResponse(_mockServerFixture.MockApi.Url);
        var mockAnswers = new FeedbackForm
        {
            Answers = new Dictionary<string, string>
            {
                { "message", "test" }
            }
        };
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, VersionPrefix("ttd", "non-existing-app"))
        {
            Content = JsonContent.Create(mockAnswers)
        };


        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task SendMessageToSlack_NullAnswers_Should_ReturnBadRequest()
    {
        object mockAnswers = null;
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, VersionPrefix("ttd", "non-existing-app"))
        {
            Content = JsonContent.Create(mockAnswers)
        };

        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task SendMessageToSlack_WithMissingAnswers_Should_ReturnBadRequest()
    {
        var mockAnswers = new FeedbackForm
        {
            Answers = null
        };
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, VersionPrefix("ttd", "non-existing-app"))
        {
            Content = JsonContent.Create(mockAnswers)
        };

        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
