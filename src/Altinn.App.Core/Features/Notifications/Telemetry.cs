using Prometheus;

namespace Altinn.App.Core.Features.Notifications;

internal static class Telemetry
{
    internal static readonly Counter OrderCount = Metrics.CreateCounter(
        "altinn_app_notification_order_request_count",
        "Number of notification order requests.",
        labelNames: ["type", "result"]
    );

    internal static class Types
    {
        internal static readonly string Sms = "sms";
        internal static readonly string Email = "email";
    }

    internal static class Result
    {
        internal static readonly string Success = "success";
        internal static readonly string Error = "error";
    }

    internal static class Dependency
    {
        internal static readonly string TypeName = "Altinn.Notifications";
        internal static readonly string Name = "OrderNotification";
    }
}
