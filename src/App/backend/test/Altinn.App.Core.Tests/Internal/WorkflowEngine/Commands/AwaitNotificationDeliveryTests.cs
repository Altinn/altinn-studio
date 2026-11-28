using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Notifications.Future;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;
using Moq;
using static Altinn.App.Core.Internal.WorkflowEngine.Commands.AwaitNotificationDelivery;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands;

public class AwaitNotificationDeliveryTests
{
    private static readonly DateTimeOffset _now = new(2026, 11, 2, 10, 0, 0, TimeSpan.Zero);
    private static readonly Guid _shipmentId = Guid.Parse("0f7a2d4e-3b1c-4c8e-9a5d-6e2f1b3c4d5e");

    private readonly Mock<INotificationShipmentClient> _shipmentClient = new();
    private readonly FakeTimeProvider _time = new(_now);

    private AwaitNotificationDelivery CreateCommand() =>
        new(_shipmentClient.Object, NullLogger<AwaitNotificationDelivery>.Instance, _time);

    private static WorkflowEngineCommandContext CreateContext(
        DateTimeOffset? requestedSendTime,
        int deferCount = 0,
        bool isFinalWaitCheck = false
    )
    {
        var mutator = new Mock<IInstanceDataMutator>();
        mutator.Setup(x => x.Instance).Returns(new Instance { Id = "1337/" + Guid.NewGuid() });

        var carry = new WorkflowCallbackStateCarry();
        if (requestedSendTime is { } sendTime)
        {
            carry.RecordNotificationShipment(_shipmentId, sendTime);
        }

        return new WorkflowEngineCommandContext
        {
            StateCarry = carry,
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutator.Object,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = Key,
                Actor = new Actor { UserId = 1337 },
                State = "{}",
                WorkflowId = Guid.Empty,
                StepId = Guid.NewGuid(),
                ExecutionReferenceTime = _now,
                DeferCount = deferCount,
                IsFinalWaitCheck = isFinalWaitCheck,
            },
        };
    }

    private void ShipmentIs(string status, params (string Type, string Status)[] recipients) =>
        _shipmentClient
            .Setup(x => x.GetShipment(_shipmentId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Shipment(status, recipients));

    private static NotificationShipmentStatus Shipment(
        string status,
        params (string Type, string Status)[] recipients
    ) =>
        new()
        {
            ShipmentId = _shipmentId,
            Status = status,
            Recipients = recipients
                .Select(r => new NotificationShipmentRecipient
                {
                    Type = r.Type,
                    Destination = "kept-out-of-messages@example.no",
                    Status = r.Status,
                })
                .ToList(),
        };

    [Fact]
    public async Task Execute_WithoutRecordedShipment_SucceedsWithoutReadingAnything()
    {
        // An app that replaced the notification service placed no order of ours.
        var result = await CreateCommand().Execute(CreateContext(requestedSendTime: null));

        Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        _shipmentClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_BeforeTheSendTime_DefersUntilItWithoutReadingTheShipment()
    {
        var result = await CreateCommand().Execute(CreateContext(_now.AddMinutes(5)));

        var deferred = Assert.IsType<DeferredWorkflowEngineCommandResult>(result);
        Assert.Equal(TimeSpan.FromMinutes(6), deferred.Delay);
        _shipmentClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_SendTimeTooFarAhead_SucceedsWithoutChecking()
    {
        var result = await CreateCommand().Execute(CreateContext(_now + MaxWaitForSendTime + TimeSpan.FromMinutes(1)));

        Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        _shipmentClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_Delivered_Succeeds()
    {
        ShipmentIs("Order_Completed", ("Email", "Email_Delivered"));

        var result = await CreateCommand().Execute(CreateContext(_now.AddMinutes(-5)));

        Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
    }

    [Fact]
    public async Task Execute_NotFinal_DefersWithTheStatusAsReason()
    {
        ShipmentIs("Order_Processing", ("SMS", "SMS_Accepted"));

        var result = await CreateCommand().Execute(CreateContext(_now.AddMinutes(-5)));

        var deferred = Assert.IsType<DeferredWorkflowEngineCommandResult>(result);
        Assert.Contains("SMS: SMS_Accepted", deferred.Reason);
    }

    [Fact]
    public async Task Execute_NotFinalOnTheFinalCheck_FailsPermanentlyNamingTheLastStatus()
    {
        ShipmentIs("Order_Processing", ("SMS", "SMS_Accepted"));

        var result = await CreateCommand()
            .Execute(CreateContext(_now.AddDays(-3), deferCount: 30, isFinalWaitCheck: true));

        var failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Contains("SMS: SMS_Accepted", failed.ErrorMessage);
        Assert.Contains(_shipmentId.ToString(), failed.ErrorMessage);
    }

    [Fact]
    public async Task Execute_Failed_FailsPermanentlyWithEachChannelButNoDestination()
    {
        ShipmentIs("Order_Completed", ("Email", "Email_Failed_Bounced"), ("SMS", "SMS_Failed_InvalidRecipient"));

        var result = await CreateCommand().Execute(CreateContext(_now.AddMinutes(-5)));

        var failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal(
            $"Notification not delivered. Email: Email_Failed_Bounced. SMS: SMS_Failed_InvalidRecipient. Shipment: {_shipmentId}.",
            failed.ErrorMessage
        );
        Assert.DoesNotContain("@", failed.ErrorMessage);
    }

    [Fact]
    public async Task Execute_ReadingTheShipmentFails_IsRetryable()
    {
        _shipmentClient
            .Setup(x => x.GetShipment(_shipmentId, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("Notifications is down"));

        var result = await CreateCommand().Execute(CreateContext(_now.AddMinutes(-5)));

        var failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
    }

    [Theory]
    [InlineData("Order_Cancelled", null, nameof(DeliveryOutcome.NotSent))]
    [InlineData("Order_SendConditionNotMet", null, nameof(DeliveryOutcome.NotSent))]
    [InlineData("Order_Registered", null, nameof(DeliveryOutcome.Pending))]
    [InlineData("Order_Failed", null, nameof(DeliveryOutcome.Failed))]
    [InlineData("Order_Processing", "Email_Succeeded", nameof(DeliveryOutcome.Pending))]
    [InlineData("Order_Completed", "SMS_Delivered", nameof(DeliveryOutcome.Delivered))]
    [InlineData("Order_Completed", "Email_Failed_RecipientReserved", nameof(DeliveryOutcome.RecipientUnreachable))]
    [InlineData("Order_Completed", "SMS_Failed_RecipientNotIdentified", nameof(DeliveryOutcome.RecipientUnreachable))]
    [InlineData("Order_Completed", "Email_Failed_Quarantined", nameof(DeliveryOutcome.Failed))]
    public void Assess_OneRecipient(string orderStatus, string? recipientStatus, string expected)
    {
        var status = recipientStatus is null
            ? Shipment(orderStatus)
            : Shipment(orderStatus, ("Recipient", recipientStatus));

        Assert.Equal(expected, Assess(status).ToString());
    }

    [Fact]
    public void Assess_DeliveredOnOneChannel_IsDeliveredEvenWhenTheOtherFailed()
    {
        var status = Shipment("Order_Completed", ("Email", "Email_Failed_Bounced"), ("SMS", "SMS_Delivered"));

        Assert.Equal(DeliveryOutcome.Delivered, Assess(status));
    }

    [Fact]
    public void Assess_OneChannelStillPending_IsPending()
    {
        var status = Shipment("Order_Processing", ("Email", "Email_Failed_Bounced"), ("SMS", "SMS_Sending"));

        Assert.Equal(DeliveryOutcome.Pending, Assess(status));
    }
}
