using System.Net;
using System.Text;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Notifications.Email;
using Altinn.App.Core.Features.Notifications.Future;
using Altinn.App.Core.Features.Notifications.Order;
using Altinn.App.Core.Features.Notifications.Sms;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Notifications.Email;
using Altinn.App.Core.Models.Notifications.Future;
using Altinn.App.Core.Models.Notifications.Order;
using Altinn.App.Core.Models.Notifications.Sms;
using Altinn.Common.AccessTokenClient.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Altinn.App.Core.Tests.Features.Notifications;

/// <summary>
/// Pins the exceptions the notification clients throw — message, inner exception — and that every
/// response they receive is disposed, whichever path the call takes.
/// </summary>
public class NotificationClientExceptionTests
{
    public const string Email = "email";
    public const string Sms = "sms";
    public const string Order = "order";
    public const string Cancel = "cancel";

    public static TheoryData<string, string> ErrorStatusCases =>
        new()
        {
            {
                Email,
                "Something went wrong when processing the email order: StatusCode=BadRequest\nReason=Bad Request\nBody=problem\n"
            },
            {
                Sms,
                "Something went wrong when processing the SMS notification order: StatusCode=BadRequest\nReason=Bad Request\nBody=problem\n"
            },
            {
                Order,
                "Something went wrong when processing the notification order: StatusCode=400 Reason=Bad Request BodyLength=7"
            },
            {
                Cancel,
                $"Something went wrong when cancelling notification order {_orderId}: StatusCode=BadRequest\nReason=Bad Request\nBody=problem\n"
            },
        };

    public static TheoryData<string, string> InvalidJsonCases =>
        new()
        {
            {
                Email,
                "Something went wrong when processing the email order: StatusCode=OK\nReason=OK\nBody=not json\n"
            },
            {
                Sms,
                "Something went wrong when processing the SMS notification order: StatusCode=OK\nReason=OK\nBody=not json\n"
            },
            {
                Order,
                "Something went wrong when processing the notification order: StatusCode=200 Reason=OK BodyLength=8"
            },
        };

    public static TheoryData<string, string> TransportFailureCases =>
        new()
        {
            { Email, "Something went wrong when processing the email order: StatusCode=\nReason=\nBody=\n" },
            { Sms, "Something went wrong when processing the SMS notification order: StatusCode=\nReason=\nBody=\n" },
            { Order, "Something went wrong when processing the notification order: StatusCode= Reason= BodyLength=0" },
            {
                Cancel,
                $"Something went wrong when cancelling notification order {_orderId}: StatusCode=\nReason=\nBody=\n"
            },
        };

    public static TheoryData<string> AllClients => [Email, Sms, Order, Cancel];

    private static readonly Guid _orderId = Guid.Parse("7d2a0c4e-58a4-4d8f-9f38-3f1a4f5f3c11");

    [Theory]
    [MemberData(nameof(ErrorStatusCases))]
    public async Task ErrorStatus_ThrowsWithStatusReasonAndBody(string client, string expectedMessage)
    {
        var response = new TrackingResponse(HttpStatusCode.BadRequest, "problem");

        var exception = await Assert.ThrowsAnyAsync<Exception>(() => Invoke(client, response));

        AssertNotificationException(client, exception);
        Assert.Equal(expectedMessage, exception.Message);
        Assert.IsType<HttpRequestException>(exception.InnerException);
        Assert.True(response.Disposed);
    }

    [Theory]
    [MemberData(nameof(InvalidJsonCases))]
    public async Task InvalidJson_ThrowsWithStatusReasonAndBody(string client, string expectedMessage)
    {
        var response = new TrackingResponse(HttpStatusCode.OK, "not json");

        var exception = await Assert.ThrowsAnyAsync<Exception>(() => Invoke(client, response));

        AssertNotificationException(client, exception);
        Assert.Equal(expectedMessage, exception.Message);
        Assert.IsAssignableFrom<JsonException>(exception.InnerException);
        Assert.True(response.Disposed);
    }

    [Theory]
    [MemberData(nameof(TransportFailureCases))]
    public async Task TransportFailure_ThrowsWithoutResponseDetails(string client, string expectedMessage)
    {
        var transportFailure = new HttpRequestException("connection refused");

        var exception = await Assert.ThrowsAnyAsync<Exception>(() => Invoke(client, transportFailure));

        AssertNotificationException(client, exception);
        Assert.Equal(expectedMessage, exception.Message);
        Assert.Same(transportFailure, exception.InnerException);
    }

    [Theory]
    [MemberData(nameof(AllClients))]
    public async Task Success_DisposesResponse(string client)
    {
        string body = client switch
        {
            Order =>
                $"{{\"notificationOrderId\":\"{Guid.NewGuid()}\",\"notification\":{{\"shipmentId\":\"{Guid.NewGuid()}\"}}}}",
            _ => "{\"orderId\":\"order123\"}",
        };
        var response = new TrackingResponse(HttpStatusCode.OK, body);

        await Invoke(client, response);

        Assert.True(response.Disposed);
    }

    private static void AssertNotificationException(string client, Exception exception)
    {
        Type expected = client switch
        {
            Email => typeof(EmailNotificationException),
            Sms => typeof(SmsNotificationException),
            Order => typeof(NotificationOrderException),
            Cancel => typeof(NotificationCancelException),
            _ => throw new ArgumentOutOfRangeException(nameof(client)),
        };
        Assert.IsType(expected, exception);
    }

    private static Task Invoke(string client, TrackingResponse response) =>
        Invoke(client, new StubHandler(() => response));

    private static Task Invoke(string client, Exception transportFailure) =>
        Invoke(client, new StubHandler(() => throw transportFailure));

    private static async Task Invoke(string client, HttpMessageHandler handler)
    {
        using var httpClient = new HttpClient(handler);
        var settings = Microsoft.Extensions.Options.Options.Create(new PlatformSettings());

        var appMetadata = new Mock<IAppMetadata>();
        appMetadata.Setup(a => a.ApplicationMetadata).Returns(new ApplicationMetadata("ttd/test-app"));

        var accessTokenGenerator = new Mock<IAccessTokenGenerator>();
        accessTokenGenerator.Setup(a => a.GenerateAccessToken(It.IsAny<string>(), It.IsAny<string>())).Returns("token");

        switch (client)
        {
            case Email:
                await new EmailNotificationClient(
                    NullLogger<EmailNotificationClient>.Instance,
                    httpClient,
                    settings,
                    appMetadata.Object,
                    accessTokenGenerator.Object
                ).Order(
                    new EmailNotification
                    {
                        Subject = "subject",
                        Body = "body",
                        Recipients = [new("test.testesen@testdirektoratet.no")],
                        SendersReference = "testref",
                    },
                    default
                );
                break;
            case Sms:
                await new SmsNotificationClient(
                    NullLogger<SmsNotificationClient>.Instance,
                    httpClient,
                    settings,
                    appMetadata.Object,
                    accessTokenGenerator.Object
                ).Order(
                    new SmsNotification
                    {
                        SenderNumber = "+4799999999",
                        Body = "body",
                        Recipients = [new("+4799999999")],
                        SendersReference = "testref",
                    },
                    default
                );
                break;
            case Order:
                await new NotificationOrderClient(
                    NullLogger<NotificationOrderClient>.Instance,
                    httpClient,
                    settings,
                    appMetadata.Object,
                    accessTokenGenerator.Object
                ).Order(
                    new NotificationOrderRequest
                    {
                        IdempotencyId = "idempotency",
                        SendersReference = "testref",
                        Recipient = new(),
                    },
                    default
                );
                break;
            case Cancel:
                await new NotificationCancelClient(
                    NullLogger<NotificationCancelClient>.Instance,
                    httpClient,
                    settings,
                    appMetadata.Object,
                    accessTokenGenerator.Object
                ).Cancel(_orderId, default);
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(client));
        }
    }

    private sealed class StubHandler(Func<HttpResponseMessage> respond) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        ) => Task.FromResult(respond());
    }

    private sealed class TrackingResponse : HttpResponseMessage
    {
        public bool Disposed { get; private set; }

        public TrackingResponse(HttpStatusCode statusCode, string body)
            : base(statusCode)
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json");
        }

        protected override void Dispose(bool disposing)
        {
            Disposed = true;
            base.Dispose(disposing);
        }
    }
}
