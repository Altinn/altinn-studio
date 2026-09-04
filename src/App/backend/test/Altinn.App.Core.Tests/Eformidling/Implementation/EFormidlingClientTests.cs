using System.Net;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.EFormidling.Configuration;
using Altinn.App.Core.EFormidling.Implementation;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.EFormidling.Models.SBD;
using Altinn.App.Core.Exceptions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Models;
using Altinn.Common.AccessTokenClient.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;

namespace Altinn.App.Core.Tests.Eformidling.Implementation;

public class EFormidlingClientTests
{
    private const string BaseUrl = "https://platform.example/eformidling/";

    /// <summary>
    /// A structurally valid JWT: <see cref="JwtToken.Parse"/> rejects anything else, and the gateway
    /// forwards this header to an introspection call, so it has to be a real token in practice.
    /// </summary>
    private const string ServiceOwnerToken =
        "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0." + "eyJzY29wZSI6ImFsdGlubjpzZXJ2aWNlb3duZXIiLCJleHAiOjQ4ODMyNjE1OTh9.";

    private sealed record Harness(IEFormidlingClient Client, List<HttpRequestMessage> Requests)
    {
        public HttpRequestMessage Request => Assert.Single(Requests);
    }

    private static Harness CreateClient(
        HttpStatusCode statusCode = HttpStatusCode.OK,
        string responseBody = "{}",
        string? baseUrl = BaseUrl
    )
    {
        var requests = new List<HttpRequestMessage>();

        var handler = new Mock<HttpMessageHandler>();
        handler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .Returns(
                (HttpRequestMessage request, CancellationToken _) =>
                {
                    requests.Add(request);
                    return Task.FromResult(
                        new HttpResponseMessage(statusCode) { Content = new StringContent(responseBody) }
                    );
                }
            );

        var appMetadata = new Mock<IAppMetadata>();
        appMetadata
            .Setup(a => a.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("ttd/test-app") { Org = "ttd" });

        var accessTokenGenerator = new Mock<IAccessTokenGenerator>();
        accessTokenGenerator.Setup(t => t.GenerateAccessToken("ttd", "test-app")).Returns("access-token");

        var tokenResolver = new Mock<IAuthenticationTokenResolver>();
        tokenResolver
            .Setup(r => r.GetAccessToken(It.IsAny<AuthenticationMethod>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(JwtToken.Parse(ServiceOwnerToken));

        var services = new ServiceCollection();
        services.AddSingleton(appMetadata.Object);
        services.AddSingleton(accessTokenGenerator.Object);
        services.AddSingleton(tokenResolver.Object);
        services.AddSingleton(Options.Create(new PlatformSettings { SubscriptionKey = "subscription-key" }));
        services.AddSingleton(Options.Create(new EFormidlingClientSettings { BaseUrl = baseUrl }));

        var httpClient = new HttpClient(handler.Object);
        var client = new EFormidlingClient(httpClient, services.BuildServiceProvider());
        return new Harness(client, requests);
    }

    private static string HeaderValue(HttpRequestMessage request, string name) =>
        request.Headers.TryGetValues(name, out var values) ? string.Join(",", values) : string.Empty;

    [Fact]
    public async Task CreateMessage_authenticates_as_the_app()
    {
        var harness = CreateClient(responseBody: "{}");

        await harness.Client.CreateMessage(new StandardBusinessDocument());

        HttpRequestMessage request = harness.Request;
        Assert.Equal(HttpMethod.Post, request.Method);
        Assert.Equal(new Uri(BaseUrl + "messages/out"), request.RequestUri);
        Assert.Equal("Bearer", request.Headers.Authorization?.Scheme);
        Assert.Equal(ServiceOwnerToken, request.Headers.Authorization?.Parameter);
        Assert.Equal("access-token", HeaderValue(request, General.EFormidlingAccessTokenHeaderName));
        Assert.Equal("subscription-key", HeaderValue(request, General.SubscriptionKeyHeaderName));
    }

    [Fact]
    public async Task GetMessageStatusById_sends_only_the_subscription_key()
    {
        // The status read is a gateway read, not an operation on the instance's behalf, so it mints
        // none of the tokens the send path needs. That matters: the poll runs from a workflow-engine
        // callback, where there is no end user to borrow a token from.
        var harness = CreateClient(responseBody: """{"content":[]}""");

        await harness.Client.GetMessageStatusById("message-id");

        HttpRequestMessage request = harness.Request;
        Assert.Equal(HttpMethod.Get, request.Method);
        Assert.Equal(new Uri(BaseUrl + "statuses?messageId=message-id"), request.RequestUri);
        Assert.Equal("subscription-key", HeaderValue(request, General.SubscriptionKeyHeaderName));
        Assert.Null(request.Headers.Authorization);
        Assert.False(request.Headers.Contains(General.EFormidlingAccessTokenHeaderName));
    }

    [Fact]
    public async Task UploadAttachment_puts_the_file_under_the_message()
    {
        var harness = CreateClient();
        using var content = new MemoryStream([1, 2, 3]);

        await harness.Client.UploadAttachment(content, "message-id", "an attachment.txt");

        HttpRequestMessage request = harness.Request;
        Assert.Equal(HttpMethod.Put, request.Method);
        // Both the id and the filename are escaped; an unescaped space or '&' would corrupt the query.
        Assert.Equal(new Uri(BaseUrl + "messages/out/message-id?title=an%20attachment.txt"), request.RequestUri);
        Assert.Equal("an attachment.txt", request.Content?.Headers.ContentDisposition?.FileName);
    }

    [Fact]
    public async Task SendMessage_posts_to_the_message()
    {
        var harness = CreateClient();

        await harness.Client.SendMessage("message-id");

        Assert.Equal(HttpMethod.Post, harness.Request.Method);
        Assert.Equal(new Uri(BaseUrl + "messages/out/message-id"), harness.Request.RequestUri);
    }

    [Fact]
    public async Task A_rejected_request_throws_with_the_status_and_body_intact()
    {
        const string body = """{"exception":"no.difi.meldingsutveksling.exceptions.MessageAlreadyExistsException"}""";
        var harness = CreateClient(HttpStatusCode.BadRequest, body);

        var exception = await Assert.ThrowsAsync<PlatformHttpException>(() =>
            harness.Client.CreateMessage(new StandardBusinessDocument())
        );

        Assert.Equal(HttpStatusCode.BadRequest, exception.StatusCode);
        // The body is captured on the exception rather than interpolated into its message, which is
        // what lets DefaultEFormidlingService recognise a duplicate without scraping the message.
        Assert.Equal(body, exception.Response.Content);
        Assert.True(DefaultEFormidlingService.IsMessageAlreadyExistsError(exception));
    }

    [Theory]
    [InlineData("null")]
    [InlineData("")]
    public async Task A_body_that_is_not_a_document_throws_rather_than_returning_null(string responseBody)
    {
        var harness = CreateClient(responseBody: responseBody);

        await Assert.ThrowsAsync<JsonException>(() => harness.Client.GetMessageStatusById("message-id"));
    }

    [Fact]
    public async Task A_base_url_without_a_trailing_slash_keeps_its_last_path_segment()
    {
        // Without the appended slash, "eformidling" would be replaced by the relative path instead of
        // prefixing it, and every request would silently go to the wrong place.
        var harness = CreateClient(baseUrl: "https://platform.example/eformidling");

        await harness.Client.SendMessage("message-id");

        Assert.Equal(
            new Uri("https://platform.example/eformidling/messages/out/message-id"),
            harness.Request.RequestUri
        );
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not a url")]
    public void An_unusable_base_url_is_a_configuration_error(string? baseUrl)
    {
        var exception = Assert.Throws<ConfigurationException>(() => CreateClient(baseUrl: baseUrl));

        Assert.Contains(nameof(EFormidlingClientSettings.BaseUrl), exception.Message);
    }
}
