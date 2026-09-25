using System.Diagnostics;
using OpenTelemetry;

namespace Altinn.Studio.Gateway.Api.Telemetry;

/// <summary>
/// Marks spans of requests the caller abandoned, such as Grafana closing an alert webhook request.
/// ASP.NET Core reports these requests as 499, and .NET records cancelled outbound calls made for them as errors,
/// although neither is a gateway failure. The collector uses the marker to report them as successful in Azure Monitor.
/// </summary>
internal sealed class CallerAbortedSpanProcessor(IHttpContextAccessor _httpContextAccessor) : BaseProcessor<Activity>
{
    internal const string CallerAbortedAttribute = "azuremonitor.caller_aborted";

    private const int ClientClosedRequestStatusCode = 499;
    private const string ErrorTypeAttribute = "error.type";

    public override void OnEnd(Activity data)
    {
        switch (data.Kind)
        {
            // ASP.NET Core also reports 499 when the request failed after the caller left; keep that an error.
            case ActivityKind.Server
                when data.Status != ActivityStatusCode.Error
                    && data.GetTagItem("http.response.status_code") is ClientClosedRequestStatusCode:
                data.SetTag(CallerAbortedAttribute, true);
                break;
            case ActivityKind.Client when IsCancelledBecauseCallerAborted(data):
                data.SetStatus(ActivityStatusCode.Unset);
                data.SetTag(ErrorTypeAttribute, null);
                data.SetTag(CallerAbortedAttribute, true);
                break;
        }
    }

    private bool IsCancelledBecauseCallerAborted(Activity activity) =>
        activity.Status == ActivityStatusCode.Error
        && activity.GetTagItem(ErrorTypeAttribute)
            is "System.Threading.Tasks.TaskCanceledException"
                or "System.OperationCanceledException"
        && _httpContextAccessor.HttpContext?.RequestAborted.IsCancellationRequested == true;
}
