using Altinn.App.Core.Features.Notifications.Future;
using Altinn.App.Core.Features.Process;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Checks that the instantiation notification reached the instance owner. Altinn Notifications accepts an order long
/// before it knows whether the email or SMS arrived, and never tells the sender, so this step reads the shipment
/// until it has a final status. It follows <see cref="NotifyInstanceOwnerOnInstantiation"/> in the same auxiliary
/// workflow and reads the shipment that step recorded.
/// </summary>
/// <remarks>
/// A notification that was not delivered fails this step permanently, which the admin panel shows as a failed
/// auxiliary workflow. Retrying it only reads the same status again: the operator follows up with the recipient.
/// </remarks>
internal sealed class AwaitInstantiationNotificationDelivery : IWorkflowEngineCommand
{
    public static string Key => "AwaitInstantiationNotificationDelivery";

    /// <summary>
    /// How far ahead of the order its send time may lie for the check to wait for it. The wait counts against
    /// <see cref="WaitBudget"/>, so a notification scheduled further out is sent but not checked.
    /// </summary>
    internal static readonly TimeSpan MaxWaitForSendTime = TimeSpan.FromDays(1);

    /// <summary>
    /// Notifications gives every email and SMS a final status within 48 hours of its send time, and holds a
    /// daytime-only SMS ordered in the evening until morning, so a status can take up to 64 hours. With
    /// <see cref="MaxWaitForSendTime"/> ahead of it, running out of this budget means Notifications never finished.
    /// </summary>
    internal static readonly TimeSpan WaitBudget = TimeSpan.FromDays(4);

    private readonly INotificationShipmentClient _shipmentClient;
    private readonly ILogger<AwaitInstantiationNotificationDelivery> _logger;
    private readonly TimeProvider _timeProvider;

    public AwaitInstantiationNotificationDelivery(
        INotificationShipmentClient shipmentClient,
        ILogger<AwaitInstantiationNotificationDelivery> logger,
        TimeProvider? timeProvider = null
    )
    {
        _shipmentClient = shipmentClient;
        _logger = logger;
        _timeProvider = timeProvider ?? TimeProvider.System;
    }

    public string GetKey() => Key;

    public ProcessStepOptions? DefaultStepOptions => new() { WaitBudget = WaitBudget };

    public async Task<WorkflowEngineCommandResult> Execute(WorkflowEngineCommandContext context)
    {
        string instanceId = context.InstanceDataMutator.Instance.Id;
        if (context.StateCarry.NotificationShipment is not { } shipment)
        {
            // The app replaced the notification service, so no order of ours was placed.
            return new SuccessfulWorkflowEngineCommandResult();
        }

        TimeSpan untilSendTime = shipment.RequestedSendTime - _timeProvider.GetUtcNow();
        if (untilSendTime > TimeSpan.Zero)
        {
            if (context.Payload.DeferCount == 0 && untilSendTime > MaxWaitForSendTime)
            {
                _logger.LogInformation(
                    "Instantiation notification for instance {InstanceId} is scheduled for {RequestedSendTime}, too far ahead to check its delivery. Shipment: {ShipmentId}.",
                    instanceId,
                    shipment.RequestedSendTime,
                    shipment.ShipmentId
                );
                return new SuccessfulWorkflowEngineCommandResult();
            }

            // Before its send time a shipment's status says nothing about delivery.
            return new DeferredWorkflowEngineCommandResult
            {
                Delay = untilSendTime + TimeSpan.FromMinutes(1),
                Reason = "Waiting for the notification's requested send time",
            };
        }

        NotificationShipmentStatus status;
        try
        {
            status = await _shipmentClient.GetShipment(shipment.ShipmentId, context.CancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            return FailedWorkflowEngineCommandResult.Retryable(ex);
        }

        string statuses = DescribeStatuses(status);
        switch (Assess(status))
        {
            case DeliveryOutcome.Delivered:
                _logger.LogInformation(
                    "Instantiation notification for instance {InstanceId} was delivered. {Statuses}. Shipment: {ShipmentId}.",
                    instanceId,
                    statuses,
                    shipment.ShipmentId
                );
                return new SuccessfulWorkflowEngineCommandResult();

            case DeliveryOutcome.NotSent:
                _logger.LogInformation(
                    "Instantiation notification for instance {InstanceId} was not sent: {Status}. Shipment: {ShipmentId}.",
                    instanceId,
                    status.Status,
                    shipment.ShipmentId
                );
                return new SuccessfulWorkflowEngineCommandResult();

            case DeliveryOutcome.RecipientUnreachable:
                _logger.LogWarning(
                    "Instantiation notification for instance {InstanceId} could not be sent to the recipient. {Statuses}. Shipment: {ShipmentId}.",
                    instanceId,
                    statuses,
                    shipment.ShipmentId
                );
                return new SuccessfulWorkflowEngineCommandResult();

            case DeliveryOutcome.Failed:
            {
                string message =
                    $"Instantiation notification not delivered. {statuses}. Shipment: {shipment.ShipmentId}.";
                _logger.LogError("{Message} Instance: {InstanceId}.", message, instanceId);
                return FailedWorkflowEngineCommandResult.Permanent(message);
            }

            default:
                if (context.Payload.IsFinalWaitCheck)
                {
                    string message =
                        $"Instantiation notification still not delivered when the check gave up. {statuses}. Shipment: {shipment.ShipmentId}.";
                    _logger.LogError("{Message} Instance: {InstanceId}.", message, instanceId);
                    return FailedWorkflowEngineCommandResult.Permanent(message);
                }

                return new DeferredWorkflowEngineCommandResult
                {
                    Delay = NextPollDelay(context.Payload.DeferCount),
                    Reason = $"Waiting for the notification to be delivered ({statuses})",
                };
        }
    }

    internal enum DeliveryOutcome
    {
        Pending,
        Delivered,
        NotSent,
        RecipientUnreachable,
        Failed,
    }

    /// <summary>
    /// What a shipment's status says about delivery. Delivery on one channel is enough, even when the other failed.
    /// A recipient who has reserved themselves against notifications, or who could not be identified, is not an
    /// error in the app or in Notifications.
    /// </summary>
    internal static DeliveryOutcome Assess(NotificationShipmentStatus status)
    {
        if (status.Status is "Order_Cancelled" or "Order_SendConditionNotMet")
        {
            return DeliveryOutcome.NotSent;
        }

        if (status.Recipients.Any(r => r.Status.EndsWith("_Delivered", StringComparison.Ordinal)))
        {
            return DeliveryOutcome.Delivered;
        }

        if (status.Recipients.Count > 0 && status.Recipients.All(r => IsFailed(r.Status)))
        {
            return status.Recipients.All(r => IsRecipientUnreachable(r.Status))
                ? DeliveryOutcome.RecipientUnreachable
                : DeliveryOutcome.Failed;
        }

        return status.Status == "Order_Failed" ? DeliveryOutcome.Failed : DeliveryOutcome.Pending;
    }

    private static bool IsFailed(string status) => status.Contains("_Failed", StringComparison.Ordinal);

    private static bool IsRecipientUnreachable(string status) =>
        status.EndsWith("_Failed_RecipientReserved", StringComparison.Ordinal)
        || status.EndsWith("_Failed_RecipientNotIdentified", StringComparison.Ordinal);

    /// <summary>
    /// Each channel's status for the operator, without the address or number it went to.
    /// </summary>
    private static string DescribeStatuses(NotificationShipmentStatus status) =>
        status.Recipients.Count == 0
            ? $"Order: {status.Status}"
            : string.Join(". ", status.Recipients.Select(r => $"{r.Type ?? "Recipient"}: {r.Status}"));

    /// <summary>
    /// Checks often while an email is likely to land within minutes, then backs off for an SMS held until daytime.
    /// </summary>
    private static TimeSpan NextPollDelay(int deferCount) =>
        deferCount switch
        {
            < 3 => TimeSpan.FromMinutes(1),
            < 8 => TimeSpan.FromMinutes(5),
            < 20 => TimeSpan.FromMinutes(30),
            _ => TimeSpan.FromHours(2),
        };
}
