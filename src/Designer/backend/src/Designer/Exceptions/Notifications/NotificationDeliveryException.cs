using System;

namespace Altinn.Studio.Designer.Exceptions.Notifications;

/// <summary>
/// Thrown after every delivery has been attempted when at least one of them failed.
/// </summary>
public sealed class NotificationDeliveryException(int failedCount, int deliveryCount)
    : Exception($"{failedCount} of {deliveryCount} notification deliveries failed.")
{
    public int FailedCount { get; } = failedCount;
    public int DeliveryCount { get; } = deliveryCount;
}
