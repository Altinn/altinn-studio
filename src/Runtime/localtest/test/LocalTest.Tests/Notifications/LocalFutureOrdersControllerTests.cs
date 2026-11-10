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
    private const string ExternalIdentity = "urn:altinn:person:idporten-email:ola@example.com";

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

    /// <summary>
    /// A reminder as NotificationService builds it, with the given properties for when it goes out. From
    /// <c>SendAfterDays</c> that is a delay and no send time of its own.
    /// </summary>
    private static JsonNode Reminder(string schedule) =>
        JsonNode.Parse(
            $$"""
            {
              "conditionEndpoint": "http://local.altinn.cloud/ttd/app/api/v1/notification-webhook-listener/1337/abc?code=token",
              {{schedule}}
              "recipient": {
                "recipientPerson": {
                  "nationalIdentityNumber": "01899699552",
                  "resourceId": "urn:altinn:resource:app_ttd_app",
                  "channelSchema": 4,
                  "ignoreReservation": false,
                  "emailSettings": { "subject": "Reminder", "body": "Body", "contentType": 0 },
                  "smsSettings": { "sender": "Altinn", "body": "Body", "sendingTimePolicy": 1 }
                }
              }
            }
            """
        )!;

    private const string SevenDaysLater = "\"delayDays\": 7,";

    private static string ExternalIdentityRecipient(int channelSchema, string text) =>
        $$"""
        {
          "recipientExternalIdentity": {
            "externalIdentity": "{{ExternalIdentity}}",
            "resourceId": "urn:altinn:resource:app_ttd_app",
            "channelSchema": {{channelSchema}},
            "emailSettings": { "subject": "{{text}} subject", "body": "{{text}} email", "contentType": 0 },
            "smsSettings": { "sender": "Altinn", "body": "{{text}} sms", "sendingTimePolicy": 1 }
          }
        }
        """;

    /// <summary>
    /// An order as NotificationService places it for an instance owner with an external identity, with a reminder
    /// that has texts of its own.
    /// </summary>
    private static JsonObject ExternalIdentityOrder(DateTimeOffset sendTime, int channelSchema) =>
        JsonNode
            .Parse(
                $$"""
                {
                  "idempotencyId": "{{Guid.NewGuid()}}",
                  "sendersReference": "app-1337/abc",
                  "requestedSendTime": "{{sendTime:O}}",
                  "conditionEndpoint": "http://local.altinn.cloud/ttd/app/api/v1/notification-webhook-listener/1337/abc?code=token",
                  "recipient": {{ExternalIdentityRecipient(channelSchema, "Notification")}},
                  "reminders": [
                    { "delayDays": 7, "recipient": {{ExternalIdentityRecipient(channelSchema, "Reminder")}} }
                  ]
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

    private static Guid ReminderShipmentId(JsonElement order) =>
        order.GetProperty("Reminders")[0].GetProperty("ShipmentId").GetGuid();

    private async Task<List<NotificationOrderView>> MessagesPageOrdersBySendTime()
    {
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
        return [.. page.NotificationOrders.OrderBy(o => o.RequestedSendTime)];
    }

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

        var listed = await MessagesPageOrdersBySendTime();
        Assert.Equal(["EmailAndSms", "Email"], listed.Select(o => o.Channel));
        Assert.Equal(["person 01899699552"], listed[0].Recipients);
        Assert.Equal(["Email", "SMS"], listed[0].Templates.Select(t => t.Kind));
        Assert.Equal("Hello", listed[0].Templates[0].Subject);
        Assert.Equal("Reminder", Assert.Single(listed[1].Templates).Subject);
    }

    [Fact]
    public async Task GetShipment_ReminderWithDelayDays_IsNotDeliveredWithTheNotification()
    {
        var request = Order("order-4", DateTimeOffset.UtcNow.AddMinutes(-1), "4");
        request["reminders"] = new JsonArray(Reminder(SevenDaysLater));
        var order = Body(await _controller.Post(request));

        var notification = await Shipment(ShipmentId(order));
        var reminder = await Shipment(ReminderShipmentId(order));

        Assert.Equal("Order_Completed", notification.GetProperty("status").GetString());
        Assert.Equal("Order_Registered", reminder.GetProperty("status").GetString());
        Assert.Equal(0, reminder.GetProperty("recipients").GetArrayLength());
    }

    [Theory]
    // Seven days after these send times, measured from the send time rather than from when the order was placed.
    [InlineData(-8, "Order_Completed", 2)]
    [InlineData(-6, "Order_Registered", 0)]
    public async Task GetShipment_ReminderWithDelayDays_CountsFromTheOrdersSendTime(
        int orderSendTimeInDays,
        string expectedStatus,
        int expectedRecipients
    )
    {
        var request = Order("order-5", DateTimeOffset.UtcNow.AddDays(orderSendTimeInDays), "4");
        request["reminders"] = new JsonArray(Reminder(SevenDaysLater));
        var order = Body(await _controller.Post(request));

        var reminder = await Shipment(ReminderShipmentId(order));

        Assert.Equal(expectedStatus, reminder.GetProperty("status").GetString());
        Assert.Equal(expectedRecipients, reminder.GetProperty("recipients").GetArrayLength());
    }

    [Fact]
    public async Task Post_ReminderWithDelayDays_ListsItsCalculatedSendTime()
    {
        var sendTime = DateTimeOffset.UtcNow.AddDays(3);
        var request = Order("order-6", sendTime, "4");
        request["reminders"] = new JsonArray(Reminder(SevenDaysLater));
        await _controller.Post(request);

        var listed = await MessagesPageOrdersBySendTime();

        Assert.Equal([sendTime, sendTime.AddDays(7)], listed.Select(o => o.RequestedSendTime));
    }

    [Theory]
    // An explicit send time stands on its own, on either side of the order's.
    [InlineData(60, -1, "Order_Completed")]
    [InlineData(-1, 60, "Order_Registered")]
    public async Task GetShipment_ReminderWithRequestedSendTime_KeepsThatTime(
        int orderSendTimeInMinutes,
        int reminderSendTimeInMinutes,
        string expectedStatus
    )
    {
        var request = Order("order-7", DateTimeOffset.UtcNow.AddMinutes(orderSendTimeInMinutes), "4");
        var reminderSendTime = DateTimeOffset.UtcNow.AddMinutes(reminderSendTimeInMinutes);
        request["reminders"] = new JsonArray(Reminder($"\"requestedSendTime\": \"{reminderSendTime:O}\","));

        var order = Body(await _controller.Post(request));

        var shipment = await Shipment(ReminderShipmentId(order));
        Assert.Equal(expectedStatus, shipment.GetProperty("status").GetString());
    }

    [Theory]
    // Notifications' validator refuses these, so an app must not get further here than it would in the cloud.
    [InlineData("")]
    [InlineData("\"delayDays\": 0,")]
    [InlineData("\"delayDays\": 7, \"requestedSendTime\": \"2100-01-01T00:00:00Z\",")]
    [InlineData("\"delayDays\": \"seven\",")]
    [InlineData("\"requestedSendTime\": \"next week\",")]
    [InlineData("\"delayDays\": 2147483647,")]
    public async Task Post_ReminderWithoutOneValidSchedule_IsRefusedAndStoresNothing(string schedule)
    {
        var request = Order("order-8", DateTimeOffset.UtcNow, "4");
        request["reminders"] = new JsonArray(Reminder(schedule));

        Assert.IsType<BadRequestObjectResult>(await _controller.Post(request));

        Assert.Empty(await MessagesPageOrdersBySendTime());
        var retried = Order("order-8", DateTimeOffset.UtcNow, "4");
        retried["reminders"] = new JsonArray(Reminder(SevenDaysLater));
        Assert.IsType<CreatedResult>(await _controller.Post(retried));
    }

    [Theory]
    // NotificationService always asks for EmailPreferred (2) for an external identity. Notifications takes any schema.
    [InlineData(2, "EmailPreferred", "Email")]
    [InlineData(1, "Sms", "SMS")]
    [InlineData(4, "EmailAndSms", "Email", "SMS")]
    public async Task Post_ExternalIdentity_ListsTheIdentityWithItsChannelAndTexts(
        int channelSchema,
        string expectedChannel,
        params string[] expectedKinds
    )
    {
        await _controller.Post(ExternalIdentityOrder(DateTimeOffset.UtcNow.AddMinutes(5), channelSchema));

        var listed = await MessagesPageOrdersBySendTime();

        Assert.Equal(2, listed.Count);
        foreach (var (listedOrder, text) in listed.Zip(["Notification", "Reminder"]))
        {
            Assert.Equal(expectedChannel, listedOrder.Channel);
            Assert.Equal([$"external identity {ExternalIdentity}"], listedOrder.Recipients);
            Assert.Equal("urn:altinn:resource:app_ttd_app", listedOrder.ResourceId);
            Assert.Equal(expectedKinds, listedOrder.Templates.Select(t => t.Kind));
            foreach (var template in listedOrder.Templates)
            {
                Assert.Equal(template.Kind == "Email" ? $"{text} subject" : null, template.Subject);
                Assert.Equal($"{text} {template.Kind.ToLowerInvariant()}", template.Body);
            }
        }
    }

    [Theory]
    [InlineData(2, "Email_Delivered")]
    [InlineData(1, "SMS_Delivered")]
    [InlineData(4, "Email_Delivered", "SMS_Delivered")]
    public async Task GetShipment_ExternalIdentity_ReportsEachChannelItAskedFor(
        int channelSchema,
        params string[] expectedChannelStatuses
    )
    {
        var order = Body(
            await _controller.Post(ExternalIdentityOrder(DateTimeOffset.UtcNow.AddMinutes(-1), channelSchema))
        );

        var shipment = await Shipment(ShipmentId(order));

        Assert.Equal(
            expectedChannelStatuses,
            shipment.GetProperty("recipients").EnumerateArray().Select(r => r.GetProperty("status").GetString())
        );
    }

    [Fact]
    public async Task Post_UnreadableRequestedSendTime_IsRefused()
    {
        var request = Order("order-9", DateTimeOffset.UtcNow, "4");
        request["requestedSendTime"] = JsonNode.Parse("\"next week\"");

        Assert.IsType<BadRequestObjectResult>(await _controller.Post(request));
    }

    [Fact]
    public async Task Post_ShipmentNotStored_LetsARetryRegisterTheOrder()
    {
        // A file where the shipments folder belongs fails the shipment write.
        string shipmentsFolder = Path.Join(_storagePath, "notifications", "shipments");
        Directory.CreateDirectory(Path.GetDirectoryName(shipmentsFolder)!);
        await File.WriteAllTextAsync(shipmentsFolder, "");
        await Assert.ThrowsAnyAsync<IOException>(() => _controller.Post(Order("order-10", DateTimeOffset.UtcNow, "4")));
        File.Delete(shipmentsFolder);

        var retried = await _controller.Post(Order("order-10", DateTimeOffset.UtcNow, "4"));

        Assert.IsType<CreatedResult>(retried);
        Assert.IsType<OkObjectResult>(await _controller.GetShipment(ShipmentId(Body(retried))));
    }

    [Fact]
    public async Task GetShipment_Unknown_IsNotFound()
    {
        Assert.IsType<NotFoundResult>(await _controller.GetShipment(Guid.NewGuid()));
    }
}
