using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using NetEscapades.EnumGenerators;
using static Altinn.App.Core.Features.Telemetry.Notifications;
using Tag = System.Collections.Generic.KeyValuePair<string, object?>;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    /// <summary>
    /// Prometheus' increase and rate functions do not register the first value as an increase, but rather as the registration.<br/>
    /// This means that going from none (non-existant) to 1 on a counter will register as an increase of 0.<br/>
    /// In order to work around this, we initialize to 0 for all metrics here.<br/>
    /// Github issue can be found <a href="https://github.com/prometheus/prometheus/issues/3806">here</a>.
    /// </summary>
    /// <param name="context"></param>
    private void InitNotifications(InitContext context)
    {
        InitMetricCounter(
            context,
            MetricNameOrder,
            init: static m =>
            {
                foreach (var type in OrderTypeExtensions.GetValues())
                {
                    foreach (var result in OrderResultExtensions.GetValues())
                    {
                        m.Add(
                            0,
                            new Tag(InternalLabels.Type, type.ToStringFast(useMetadataAttributes: true)),
                            new Tag(InternalLabels.Result, result.ToStringFast(useMetadataAttributes: true))
                        );
                    }
                }
            }
        );
    }

    internal Activity? StartNotificationOrderActivity(OrderType type)
    {
        var activity = ActivitySource.StartActivity("Notifications.Order");
        activity?.SetTag(InternalLabels.Type, type.ToStringFast(useMetadataAttributes: true));
        return activity;
    }

    internal void RecordNotificationOrder(OrderType type, OrderResult result) =>
        _counters[MetricNameOrder]
            .Add(
                1,
                new Tag(InternalLabels.Type, type.ToStringFast(useMetadataAttributes: true)),
                new Tag(InternalLabels.Result, result.ToStringFast(useMetadataAttributes: true))
            );

    internal static class Notifications
    {
        internal static readonly string MetricNameOrder = Metrics.CreateLibName("notification_orders");

        [EnumExtensions]
        internal enum OrderResult
        {
            [Display(Name = "success")]
            Success,

            [Display(Name = "error")]
            Error,
        }

        [EnumExtensions]
        internal enum OrderType
        {
            [Display(Name = "sms")]
            Sms,

            [Display(Name = "email")]
            Email,
        }
    }
}
