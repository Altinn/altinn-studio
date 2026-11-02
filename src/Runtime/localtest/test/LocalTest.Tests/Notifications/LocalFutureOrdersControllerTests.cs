using System.Text.Json;
using System.Text.Json.Nodes;
using LocalTest.Configuration;
using LocalTest.Controllers;
using LocalTest.Models;
using LocalTest.Notifications.LocalTestNotifications;
using LocalTest.Services.Correspondence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
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
                      "channelSchema": {{(int.TryParse(channel, out _) ? channel : $"\"{channel}\"")}},
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
    // The app libraries send the channel schema as its position in the enum: 4 is EmailAndSms.
    [InlineData("4", "Hello", "Order_Completed", "Email_Delivered", "SMS_Delivered")]
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
    public async Task Post_ListsTheNotificationAndItsRemindersOnTheMessagesPage()
    {
        var order = Order("order-3", DateTimeOffset.UtcNow.AddMinutes(5), "EmailAndSms");
        order["reminders"] = new JsonArray(
            JsonNode.Parse(
                $$"""
                {
                  "requestedSendTime": "{{DateTimeOffset.UtcNow.AddDays(7):O}}",
                  "recipient": {
                    "recipientPerson": {
                      "nationalIdentityNumber": "01899699552",
                      "channelSchema": "Email",
                      "emailSettings": { "subject": "Reminder", "body": "Body" }
                    }
                  }
                }
                """
            )
        );
        await _controller.Post(order);

        var settings = Options.Create(
            new LocalPlatformSettings { LocalTestingStorageBasePath = _storagePath + Path.DirectorySeparatorChar }
        );
        using var repository = new LocalCorrespondenceRepository(
            settings,
            NullLogger<LocalCorrespondenceRepository>.Instance
        );
        var page = Assert.IsType<MessagesViewModel>(
            Assert.IsType<ViewResult>(await new MessagesController(repository, settings).Index()).Model
        );

        var listed = page.NotificationOrders.OrderBy(o => o.RequestedSendTime).ToList();
        Assert.Equal(["EmailAndSms", "Email"], listed.Select(o => o.Channel));
        Assert.Equal(["person 01899699552"], listed[0].Recipients);
        Assert.Equal(["Email", "SMS"], listed[0].Templates.Select(t => t.Kind));
        Assert.Equal("Hello", listed[0].Templates[0].Subject);
        Assert.Equal("Reminder", Assert.Single(listed[1].Templates).Subject);
    }

    [Fact]
    public async Task GetShipment_Unknown_IsNotFound()
    {
        Assert.IsType<NotFoundResult>(await _controller.GetShipment(Guid.NewGuid()));
    }
}
