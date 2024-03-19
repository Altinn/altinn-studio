namespace Altinn.App.Core.Tests.Infrastructure.Clients.Email;

using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Infrastructure.Clients.Email;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Email;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Email;
using Altinn.Common.AccessTokenClient.Services;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using Xunit;

public class EmailNotificationClientTests
{
    [Fact]
    public async void Order_VerifyHttpCall()
    {
        // Arrange
        var emailNotification = new EmailNotification
        {
            Subject = "subject",
            Body = "body",
            Recipients = [new("test.testesen@testdirektoratet.no")],
            SendersReference = "testref",
            RequestedSendTime = DateTime.UtcNow
        };
        var expectedUri = "http://localhost:5101/notifications/api/v1/orders/email";
        var expectedContent = JsonSerializer.Serialize(emailNotification);

        HttpRequestMessage? capturedRequest = null; // Capture request to verify the uri used in the http call.
        string capturedContent = string.Empty; // Capture http content to verify.

        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"orderId\": \"order123\"}", Encoding.UTF8, "application/json")
            })
            .Callback<HttpRequestMessage, CancellationToken>(async (request, token) =>
            {
                capturedRequest = request;
                capturedContent = await request.Content!.ReadAsStringAsync(token);
            });

        var httpClientFactoryMock = new Mock<IHttpClientFactory>();
        var httpClient = new HttpClient(handlerMock.Object);

        httpClientFactoryMock.Setup(h => h.CreateClient(It.IsAny<string>())).Returns(httpClient);

        var emailNotificationClient = CreateEmailNotificationClient(httpClientFactoryMock);
        var ct = CancellationToken.None;

        // Act
        _ = await emailNotificationClient.Order(emailNotification, ct);

        // Assert
        capturedContent.Should().Be(expectedContent);
        capturedRequest.Should().NotBeNull();
        capturedRequest!.RequestUri.Should().NotBeNull();
        capturedRequest!.RequestUri!.ToString().Should().Be(expectedUri);
    }

    [Fact]
    public async void Order_ShouldReturnOrderId_OnSuccess()
    {
        // Arrange
        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() =>
            {
                var jsonContent = new StringContent("{\"orderId\": \"order123\"}", Encoding.UTF8, "application/json");
                var response = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = jsonContent,
                };
                return response;
            });

        var httpClientFactoryMock = new Mock<IHttpClientFactory>();
        var httpClient = new HttpClient(handlerMock.Object);

        httpClientFactoryMock.Setup(h => h.CreateClient(It.IsAny<string>())).Returns(httpClient);

        var emailNotificationClient = CreateEmailNotificationClient(httpClientFactoryMock);
        var recipients = new List<EmailRecipient>()
        {
            new("test.testesen@testdirektoratet.no")
        };

        var emailNotification = new EmailNotification
        {
            Subject = "subject",
            Body = "body",
            Recipients = recipients,
            SendersReference = "testref"
        };
        var ct = new CancellationTokenSource().Token;

        // Act
        var emailOrderResponse = await emailNotificationClient.Order(emailNotification, ct);

        // Assert
        emailOrderResponse.Should().NotBeNull();
        emailOrderResponse.OrderId.ToString().Should().BeEquivalentTo("order123");
    }

    [Fact]
    public async void Order_ShouldThrowEmailNotificationException_OnFailure()
    {
        // Arrange
        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() =>
            {
                var jsonContent = new StringContent(string.Empty, Encoding.UTF8, "application/json");
                var response = new HttpResponseMessage(HttpStatusCode.BadRequest)
                {
                    Content = jsonContent,
                };
                return response;
            });

        var httpClientFactoryMock = new Mock<IHttpClientFactory>();
        var httpClient = new HttpClient(handlerMock.Object);

        httpClientFactoryMock.Setup(h => h.CreateClient(It.IsAny<string>())).Returns(httpClient);

        var emailNotificationClient = CreateEmailNotificationClient(httpClientFactoryMock);
        var recipients = new List<EmailRecipient>()
        {
            new("test.testesen@testdirektoratet.no")
        };

        var emailNotification = new EmailNotification
        {
            Subject = "subject",
            Body = "body",
            Recipients = recipients,
            SendersReference = "testref"
        };
        var ct = new CancellationTokenSource().Token;

        // Act
        // Define an asynchronous delegate action, allowing for the capture and testing of any exceptions thrown.
        Func<Task> orderEmailNotification = async () => await emailNotificationClient.Order(emailNotification, ct);

        // Assert
        await FluentActions.Awaiting(orderEmailNotification).Should().ThrowAsync<EmailNotificationException>();
    }

    private static EmailNotificationClient CreateEmailNotificationClient(Mock<IHttpClientFactory> mockHttpClientFactory)
    {
        var appDataMock = new Mock<IAppMetadata>();
        appDataMock.Setup(a => a.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("ttd/app-lib-test"));

        var accessTokenGenerator = new Mock<IAccessTokenGenerator>();
        accessTokenGenerator.Setup(a => a.GenerateAccessToken(It.IsAny<string>(), It.IsAny<string>()))
            .Returns("token");

        return new EmailNotificationClient(mockHttpClientFactory.Object, Options.Create(new PlatformSettings()), appDataMock.Object, accessTokenGenerator.Object, new Microsoft.ApplicationInsights.TelemetryClient());
    }
}
