using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using NetEscapades.EnumGenerators;
using static Altinn.App.Core.Features.Telemetry.NotifySigneesConst;
using static Altinn.App.Core.Features.Telemetry.ServiceOwnerPartyConst;
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
    private void InitSigning(InitContext context)
    {
        InitMetricCounter(
            context,
            MetricNameNotifySignees,
            init: static m =>
            {
                foreach (var result in NotifySigneesResultExtensions.GetValues())
                {
                    m.Add(0, new Tag(InternalLabels.Result, result.ToStringFast(useMetadataAttributes: true)));
                }
            }
        );

        InitMetricCounter(
            context,
            MetricNameGetServiceOwnerParty,
            init: static m =>
            {
                foreach (var result in ServiceOwnerPartyResultExtensions.GetValues())
                {
                    m.Add(0, new Tag(InternalLabels.Result, result.ToStringFast(useMetadataAttributes: true)));
                }
            }
        );
    }

    internal void RecordNotifySignees(NotifySigneesResult result) =>
        _counters[MetricNameNotifySignees]
            .Add(1, new Tag(InternalLabels.Result, result.ToStringFast(useMetadataAttributes: true)));

    internal void RecordGetServiceOwnerParty(ServiceOwnerPartyResult result) =>
        _counters[MetricNameGetServiceOwnerParty]
            .Add(1, new Tag(InternalLabels.Result, result.ToStringFast(useMetadataAttributes: true)));

    internal Activity? StartAssignSigneesActivity() => ActivitySource.StartActivity("SigningService.AssignSignees");

    internal Activity? StartReadSigneesActivity() => ActivitySource.StartActivity("SigningService.ReadSignees");

    internal Activity? StartReadAuthorizedSigneesActivity() =>
        ActivitySource.StartActivity("SigningService.ReadAuthorizedSignees");

    internal Activity? StartRemoveSigneeStateActivity() =>
        ActivitySource.StartActivity("SigningService.RemoveSigneeState");

    internal Activity? StartRemoveAllSignaturesActivity(string dataType)
    {
        Activity? activity = ActivitySource.StartActivity("SigningService.RemoveAllSignatures");
        activity?.SetTag(Labels.DataType, dataType);
        return activity;
    }

    internal Activity? StartAbortRuntimeDelegatedSigningActivity(string taskId)
    {
        Activity? activity = ActivitySource.StartActivity("SigningService.AbortRuntimeDelegatedSigning");
        activity?.SetTag(Labels.TaskId, taskId);
        return activity;
    }

    internal Activity? StartGetServiceOwnerPartyActivity() =>
        ActivitySource.StartActivity("SigningService.GetServiceOwnerParty");

    internal Activity? StartGetInstanceOwnerPartyActivity() =>
        ActivitySource.StartActivity("SigningService.GetInstanceOwnerParty");

    internal static class ServiceOwnerPartyConst
    {
        internal static readonly string MetricNameGetServiceOwnerParty = Metrics.CreateLibName(
            "singing_get_service_owner_party"
        );

        [EnumExtensions]
        internal enum ServiceOwnerPartyResult
        {
            [Display(Name = "success")]
            Success,

            [Display(Name = "error")]
            Error,
        }
    }

    internal static class NotifySigneesConst
    {
        internal static readonly string MetricNameNotifySignees = Metrics.CreateLibName("signing_notify_signees");

        [EnumExtensions]
        internal enum NotifySigneesResult
        {
            [Display(Name = "success")]
            Success,

            [Display(Name = "error")]
            Error,
        }
    }
}
