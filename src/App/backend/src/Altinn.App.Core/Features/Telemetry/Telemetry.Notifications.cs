using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using NetEscapades.EnumGenerators;
using static Altinn.App.Core.Features.Telemetry.Notifications;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    private void InitNotifications(InitContext context)
    {
        InitMetricCounter(context, MetricNameOrder, "{order}", "Notification orders the app placed.");
        InitMetricCounter(context, MetricNameOrderCancel, "{cancellation}", "Notification orders the app cancelled.");
    }

    internal Activity? StartNotificationConditionTokenGenerateActivity(Guid instanceGuid)
    {
        var activity = LibraryActivitySource.StartActivity("Notifications.Condition.GenerateToken");
        activity?.SetTag(InternalLabels.NotificationOrderId, instanceGuid);
        return activity;
    }

    internal Activity? StartNotificationConditionValidateActivity(Guid instanceGuid)
    {
        var activity = LibraryActivitySource.StartActivity("Notifications.Condition.ValidateCode");
        activity?.SetTag(InternalLabels.NotificationOrderId, instanceGuid);
        return activity;
    }

    internal Activity? StartNotificationOrderActivity(OrderType type)
    {
        var activity = LibraryActivitySource.StartActivity("Notifications.Order");
        activity?.SetTag(InternalLabels.NotificationType, type.ToStringFast(useMetadataAttributes: true));
        return activity;
    }

    internal void RecordNotificationOrder(OrderType type, OrderResult result)
    {
        var tags = Outcome(failed: result == OrderResult.Error);
        tags.Add(InternalLabels.NotificationType, type.ToStringFast(useMetadataAttributes: true));
        _counters[MetricNameOrder].Add(1, tags);
    }

    internal Activity? StartNotificationOrderCancelActivity(Guid orderId)
    {
        var activity = LibraryActivitySource.StartActivity("Notifications.Order.Cancel");
        activity?.SetTag(InternalLabels.NotificationOrderId, orderId);
        return activity;
    }

    internal void RecordNotificationOrderCancel(CancelResult result) =>
        _counters[MetricNameOrderCancel]
            .Add(
                1,
                result switch
                {
                    CancelResult.Success => default,
                    // The caller gave up, such as a request that was aborted, rather than the cancellation failing.
                    CancelResult.Cancelled => new TagList { { InternalLabels.ErrorType, ErrorTypeCancelled } },
                    _ => Outcome(failed: true),
                }
            );

    internal static class Notifications
    {
        internal static readonly string MetricNameOrder = Metrics.CreateLibName("notification.orders");
        internal static readonly string MetricNameOrderCancel = Metrics.CreateLibName(
            "notification.order_cancellations"
        );

        [EnumExtensions(MetadataSource = MetadataSource.DisplayAttribute)]
        internal enum OrderResult
        {
            [Display(Name = "success")]
            Success,

            [Display(Name = "error")]
            Error,
        }

        [EnumExtensions(MetadataSource = MetadataSource.DisplayAttribute)]
        internal enum OrderType
        {
            [Display(Name = "sms")]
            Sms,

            [Display(Name = "email")]
            Email,

            [Display(Name = "future")]
            Future,
        }

        [EnumExtensions(MetadataSource = MetadataSource.DisplayAttribute)]
        internal enum CancelResult
        {
            [Display(Name = "success")]
            Success,

            [Display(Name = "error")]
            Error,

            [Display(Name = "cancelled")]
            Cancelled,
        }
    }
}
