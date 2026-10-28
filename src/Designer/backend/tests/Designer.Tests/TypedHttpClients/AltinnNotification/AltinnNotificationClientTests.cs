using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AltinnNotification;
using Microsoft.Extensions.Hosting;
using Moq;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;
using Xunit;

namespace Designer.Tests.TypedHttpClients.AltinnNotification;

public class AltinnNotificationClientTests : IDisposable
{
    private const string OrdersPath = "notifications/api/v1/future/orders";

    private readonly WireMockServer _server = WireMockServer.Start();

    [Fact]
    public async Task SendSmsNotification_WhenOrderIsRejected_ThrowsWithTheReason()
    {
        const string ProblemDetails =
            """{"title":"One or more validation errors occurred.","errors":{"Recipient.RecipientSms.PhoneNumber":["Recipient phone number is not a valid mobile number."]}}""";
        _server
            .Given(Request.Create().WithPath($"/{OrdersPath}").UsingPost())
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.BadRequest).WithBody(ProblemDetails));

        var exception = await Assert.ThrowsAsync<HttpRequestException>(() =>
            CreateClient().SendSmsNotification("idempotency-id", "12345678", "body")
        );

        Assert.Equal(HttpStatusCode.BadRequest, exception.StatusCode);
        Assert.Contains("Recipient phone number is not a valid mobile number.", exception.Message);
    }

    [Fact]
    public async Task SendEmailNotification_WhenOrderIsAccepted_DoesNotThrow()
    {
        _server
            .Given(Request.Create().WithPath($"/{OrdersPath}").UsingPost())
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.Created));

        await CreateClient().SendEmailNotification("idempotency-id", "service@example.com", "subject", "body");

        Assert.Single(_server.LogEntries);
    }

    private AltinnNotificationClient CreateClient()
    {
        var environmentsService = new Mock<IEnvironmentsService>();
        environmentsService.Setup(s => s.CreatePlatformUri("tt02")).ReturnsAsync(new Uri($"{_server.Url}/"));
        var hostEnvironment = new Mock<IHostEnvironment>();
        hostEnvironment.Setup(e => e.EnvironmentName).Returns(Environments.Development);

        return new AltinnNotificationClient(
            new HttpClient(),
            environmentsService.Object,
            hostEnvironment.Object,
            new PlatformSettings { ApiNotificationOrdersUri = OrdersPath }
        );
    }

    public void Dispose() => _server.Stop();
}
