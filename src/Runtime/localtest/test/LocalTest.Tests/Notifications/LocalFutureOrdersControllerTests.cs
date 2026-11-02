using System.Text.Json;
using System.Text.Json.Nodes;
using LocalTest.Configuration;
using LocalTest.Notifications.LocalTestNotifications;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Xunit;

namespace LocalTest.Tests.Notifications;

public sealed class LocalFutureOrdersControllerTests : IDisposable
{
    private readonly string _storagePath = Path.Join(Path.GetTempPath(), $"localtest-future-orders-{Guid.NewGuid():N}");
    private readonly LocalFutureOrdersController _controller;

    public LocalFutureOrdersControllerTests()
    {
        _controller = new LocalFutureOrdersController(
            Options.Create(
                new LocalPlatformSettings { LocalTestingStorageBasePath = _storagePath + Path.DirectorySeparatorChar }
            )
        );
    }

    public void Dispose()
    {
        if (Directory.Exists(_storagePath))
        {
            Directory.Delete(_storagePath, recursive: true);
        }
    }

    private static JsonObject Order(string idempotencyId, DateTimeOffset sendTime, string channel, string subject = "Hello") =>
        JsonNode
            .Parse(
                $$"""
                {
                  "idempotencyId": "{{idempotencyId}}",
                  "sendersReference": "app-1337/abc",
                  "requestedSendTime": "{{sendTime:O}}",
                  "recipient": {
                    "recipientPerson": {
                      "nationalIdentityNumber": "01899699552",
                      "channelSchema": "{{channel}}",
                      "emailSettings": { "subject": "{{subject}}", "body": "Body" },
                      "smsSettings": { "body": "Body" }
                    }
                  }
                }
                """
            )!
            .AsObject();

    private static JsonElement Body(IActionResult result) =>
        JsonSerializer.SerializeToElement(Assert.IsAssignableFrom<ObjectResult>(result).Value);

    private async Task<JsonElement> Shipment(Guid shipmentId) =>
        Body(await _controller.GetShipment(shipmentId));

    private static Guid ShipmentId(JsonElement order) =>
        order.GetProperty("Notification").GetProperty("ShipmentId").GetGuid();

    [Fact]
    public async Task Post_RepeatedIdempotencyId_ReturnsTheFirstOrder()
    {
        var first = await _controller.Post(Order("order-1", DateTimeOffset.UtcNow, "Email"));
        var second = await _controller.Post(Order("order-1", DateTimeOffset.UtcNow.AddDays(1), "Sms"));

        Assert.IsType<CreatedResult>(first);
        Assert.IsType<OkObjectResult>(second);
        Assert.Equal(ShipmentId(Body(first)), ShipmentId(Body(second)));
    }

    [Fact]
    public async Task GetShipment_BeforeTheSendTime_HasNoRecipientsYet()
    {
        var order = Body(await _controller.Post(Order("order-2", DateTimeOffset.UtcNow.AddHours(1), "Email")));

        var shipment = await Shipment(ShipmentId(order));

        Assert.Equal("Order_Registered", shipment.GetProperty("status").GetString());
        Assert.Equal(0, shipment.GetProperty("recipients").GetArrayLength());
    }

    [Theory]
    [InlineData("EmailAndSms", "Hello", "Order_Completed", "Email_Delivered", "SMS_Delivered")]
    [InlineData("EmailAndSms", "localtest:failed", "Order_Completed", "Email_Failed_Bounced", "SMS_Failed_InvalidRecipient")]
    [InlineData("Email", "localtest:reserved", "Order_Completed", "Email_Failed_RecipientReserved")]
    [InlineData("Sms", "localtest:pending", "Order_Processing", "SMS_New")]
    public async Task GetShipment_AfterTheSendTime_ReportsEachChannel(
        string channel,
        string subject,
        string expectedStatus,
        params string[] expectedChannelStatuses
    )
    {
        var order = Body(
            await _controller.Post(Order(Guid.NewGuid().ToString(), DateTimeOffset.UtcNow.AddMinutes(-1), channel, subject))
        );

        var shipment = await Shipment(ShipmentId(order));

        Assert.Equal(expectedStatus, shipment.GetProperty("status").GetString());
        Assert.Equal(
            expectedChannelStatuses,
            shipment.GetProperty("recipients").EnumerateArray().Select(r => r.GetProperty("status").GetString())
        );
    }

    [Fact]
    public async Task GetShipment_Unknown_IsNotFound()
    {
        Assert.IsType<NotFoundResult>(await _controller.GetShipment(Guid.NewGuid()));
    }
}
